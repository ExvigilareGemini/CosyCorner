import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import * as nodemailer from "nodemailer";
import DOMPurify from "isomorphic-dompurify";
import rateLimiter from "../utils/rateLimiter.js";

// Schéma de validation Zod pour le téléphone dans le formulaire de contact
const globalPhoneSchema = z.preprocess(
  (val) => val ?? "",
  z
    .string()
    .transform((val) => val.trim())
    .refine(
      (val) => {
        // Supprime tous les caractères non numériques sauf le +Je travaille sur la partie de la protection sur les injection de code XSS pour mon formulaire. Comment effectuer une sécurisation de mon formulaire ?
        const cleaned = val.replace(/[^\+0-9]/g, "");

        // Vérifie si commence par + (international) ou par un chiffre
        const hasValidStart = /^[\+0-9]/.test(cleaned);

        // Vérifie la longueur (7-15 chiffres selon ITU-T E.164)
        const digitCount = cleaned.replace(/\+/, "").length;
        const hasValidLength = digitCount >= 7 && digitCount <= 15;

        return hasValidStart && hasValidLength && cleaned.length > 0;
      },
      {
        message: "Format de numéro de téléphone international invalide",
      }
    )
);

// Schéma de validation Zod - sécurise et valide toutes les entrées
const contactSchema = z.object({
  name: z.preprocess(
    (val) => val ?? "",
    z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères")
      .max(100, "Le nom ne peut pas dépasser 100 caractères")
      .refine((val) => {
        // Check for potential script tags or dangerous patterns
        const dangerousPatterns = /<script|javascript:|on\w+\s*=|data:/i;
        return !dangerousPatterns.test(val);
      }, "Caractères non autorisés détectés")
  ),

  firstName: z.preprocess(
    (val) => val ?? "",
    z
      .string()
      .min(2, "Le prénom doit contenir au moins 2 caractères")
      .max(100, "Le prénom ne peut pas dépasser 100 caractères")
      .refine((val) => {
        const dangerousPatterns = /<script|javascript:|on\w+\s*=|data:/i;
        return !dangerousPatterns.test(val);
      }, "Caractères non autorisés détectés")
  ),

  email: z.preprocess(
    (val) => val ?? "",
    z
      .string()
      .email("Adresse email invalide")
      .max(254, "Email trop long")
      .refine((email) => {
        // Simple check for header injection without modifying the email
        const dangerousPatterns = /[\r\n]|javascript:|data:|vbscript:/i;
        return !dangerousPatterns.test(email);
      }, "Format d'email non autorisé")
  ),

  tel: globalPhoneSchema,

  message: z.preprocess((val) => {
    if (!val) return "";
    // Sanitize HTML content while preserving safe formatting
    return DOMPurify.sanitize(val, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true, // Keep text content
    });
  }, z.string().min(10, "Le message doit contenir au moins 10 caractères").max(2000, "Le message ne peut pas dépasser 2000 caractères")),

  // Champ honeypot - doit être vide (détection de bots)
  business_email: z.string().max(0, "Activité suspecte détectée").optional(),

  // Champ timestamp (peut être utilisé pour la sécurité)
  timestamp: z
    .preprocess(
      (val) => (val ? parseInt(val) : Date.now()),
      z.number().refine((timestamp) => {
        const now = Date.now();
        const timeTaken = now - timestamp;
        // Minimum 3 secondes pour remplir le formulaire
        return timeTaken >= 3000;
      }, "Formulaire soumis trop rapidement")
    )
    .optional(),

  consent: z.preprocess(
    (val) => {
      // FormData renvoie "on" pour les checkboxes cochées, undefined sinon
      return val === "on" || val === true;
    },
    z.boolean().refine((val) => val === true, {
      message: "Vous devez accepter la politique de confidentialité",
    })
  ),
});

export const server = {
  sendContactEmail: defineAction({
    accept: "form",
    input: contactSchema,
    handler: async (input, context) => {
      // Rate limiting check - FIRST security layer
      const rateLimitResult = rateLimiter.isAllowed(context.request);

      if (!rateLimitResult.allowed) {
        console.warn(
          `[SECURITY] Rate limit exceeded for IP: ${rateLimiter.getClientIP(
            context.request
          )}`
        );

        // Calculate remaining time in minutes
        const remainingTime = Math.ceil(
          (rateLimitResult.resetTime - Date.now()) / (1000 * 60)
        );

        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: `Trop de tentatives. Réessayez dans ${remainingTime} minute(s).`,
        });
      }

      // Vérification honeypot - bloquer les bots silencieusement
      if (input.business_email && input.business_email.length > 0) {
        console.warn("[SECURITY] Bot détecté via honeypot");
        // Réponse silencieuse pour ne pas alerter le bot
        return {
          success: true,
          message: "Emails envoyés avec succès",
          timestamp: new Date().toISOString(),
        };
      }

      try {
        // Sanitize all inputs before using them
        const sanitizedInput = {
          name: input.name.replace(/[\r\n]/g, "").trim(),
          firstName: input.firstName.replace(/[\r\n]/g, "").trim(),
          email: input.email.trim(), // Email is already validated by Zod, just trim
          tel: input.tel.trim(),
          message: DOMPurify.sanitize(input.message, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
          }),
        };
        // Configuration du transporteur Nodemailer pour Gmail
        const transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: import.meta.env.EMAIL_USER,
            pass: import.meta.env.EMAIL_APP_PASSWORD,
          },
          // Additional security options
          tls: {
            rejectUnauthorized: true, // Reject invalid certificates
            minVersion: "TLSv1.2", // Minimum TLS version
          },
          connectionTimeout: 10000, // Connection timeout
          greetingTimeout: 5000, // Greeting timeout
          socketTimeout: 15000, // Socket timeout
        });

        await transporter.verify();

        // Configuration du mail
        const mailOptions = {
          from: {
            name: "Formulaire de Contact",
            address: import.meta.env.EMAIL_USER,
          },
          to: import.meta.env.CONTACT_EMAIL,
          // Sanitize the subject line
          subject: `Nouveau message de ${sanitizedInput.firstName.replace(
            /[^\w\s-]/g,
            ""
          )} ${sanitizedInput.name.replace(/[^\w\s-]/g, "")}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                Nouveau message
              </h2>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #007bff; margin-top: 0;">Informations du contact</h3>
                <p><strong>Nom :</strong> ${sanitizedInput.name}</p>
                <p><strong>Prénom :</strong> ${sanitizedInput.firstName}</p>
                <p><strong>Email :</strong> <a href="mailto:${
                  sanitizedInput.email
                }">${sanitizedInput.email}</a></p>
                <p><strong>Téléphone :</strong> <a href="tel:${
                  sanitizedInput.tel
                }">${sanitizedInput.tel}</a></p>
              </div>

              <div style="background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px;">
                <h3 style="color: #007bff; margin-top: 0;">Message</h3>
                <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">
${sanitizedInput.message}
                </div>
              </div>

              <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 5px; font-size: 12px; color: #666;">
                <p><strong>Informations techniques :</strong></p>
                <p>Date d'envoi : ${new Date().toLocaleString("fr-FR")}</p>
                <p>Consentement accepté : Oui</p>
              </div>
            </div>
          `,
          text: `
Nouveau message du formulaire de contact

INFORMATIONS DU CONTACT :
Nom : ${sanitizedInput.name}
Prénom : ${sanitizedInput.firstName}
Email : ${sanitizedInput.email}
Téléphone : ${sanitizedInput.tel}

MESSAGE :
${sanitizedInput.message}

---
Date d'envoi : ${new Date().toLocaleString("fr-FR")}
Consentement accepté : Oui
          `,
          replyTo: sanitizedInput.email, // Permet de répondre directement au visiteur
        };

        // Email de confirmation pour l'expéditeur
        const confirmationMail = {
          from: {
            name: "Votre Site Web",
            address: import.meta.env.EMAIL_USER,
          },
          to: sanitizedInput.email,
          subject: "Confirmation de réception de votre message",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
                Message bien reçu !
              </h2>
              
              <p>Bonjour ${sanitizedInput.firstName},</p>
              
              <p>Nous avons bien reçu votre message et vous en remercions. Notre équipe vous répondra dans les plus brefs délais.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">Récapitulatif de votre message :</h3>
                <p><strong>Sujet :</strong> Demande de contact</p>
                <p><strong>Date d'envoi :</strong> ${new Date().toLocaleString(
                  "fr-FR"
                )}</p>
              </div>

              <div style="margin-top: 30px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                <p style="margin: 0; color: #1565c0;">
                  <strong>💡 En attendant notre réponse :</strong><br>
                  N'hésitez pas à nous suivre sur nos réseaux sociaux.
                </p>
              </div>

              <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #666;">
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre directement.</p>
              </div>
            </div>
          `,
          text: `
Bonjour ${sanitizedInput.firstName},

Nous avons bien reçu votre message et vous en remercions. Notre équipe vous répondra dans les plus brefs délais.

Récapitulatif :
- Sujet : Demande de contact  
- Date d'envoi : ${new Date().toLocaleString("fr-FR")}

En attendant notre réponse, n'hésitez pas à consulter notre FAQ.

Cet email a été envoyé automatiquement.
          `,
        };

        // Envoi des emails
        const mainEmailResult = await transporter.sendMail(mailOptions);

        const confirmEmailResult = await transporter.sendMail(confirmationMail);

        transporter.close();

        // Retourner le succès
        return {
          success: true,
          message: "Emails envoyés avec succès",
          timestamp: new Date().toISOString(),
          emailIds: {
            main: mainEmailResult.messageId,
            confirmation: confirmEmailResult.messageId,
          },
        };
      } catch (emailError) {
        // Always log errors securely
        console.error("[EMAIL_ERROR] Contact form submission failed", {
          errorCode: emailError.code || "UNKNOWN",
          timestamp: new Date().toISOString(),
        });

        // Always return generic message
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Service temporairement indisponible. Veuillez réessayer plus tard.",
        });
      }
    },
  }),
};
