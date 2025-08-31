import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import * as nodemailer from "nodemailer";

// Schéma de validation Zod pour le téléphone dans le formulaire de contact
const globalPhoneSchema = z.preprocess(
  (val) => val ?? "",
  z
    .string()
    .transform((val) => val.trim())
    .refine(
      (val) => {
        // Supprime tous les caractères non numériques sauf le +
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
  ),

  firstName: z.preprocess(
    (val) => val ?? "",
    z
      .string()
      .min(2, "Le prénom doit contenir au moins 2 caractères")
      .max(100, "Le prénom ne peut pas dépasser 100 caractères")
  ),

  email: z.preprocess(
    (val) => val ?? "",
    z
      .string()
      .email("Adresse email invalide")
      .max(254, "Email trop long")
      .refine(
        (email) => !email.includes("\n") && !email.includes("\r"),
        "Caractères interdits dans l'email"
      )
  ),

  tel: globalPhoneSchema,

  message: z.preprocess(
    (val) => val ?? "",
    z
      .string()
      .min(10, "Le message doit contenir au moins 10 caractères")
      .max(2000, "Le message ne peut pas dépasser 2000 caractères")
  ),

  // Champ honeypot - doit être vide (détection de bots)
  website: z
    .string()
    .max(0, "Champ honeypot détecté - bot suspecté")
    .optional(),

  // Champ timestamp (peut être utilisé pour la sécurité)
  timestamp: z.string().optional(),

  consent: z.preprocess(
    (val) => {
      // FormData renvoie "on" pour les checkboxes cochées, undefined sinon
      return val === "on" || val === true;
    }, 
    z.boolean().refine((val) => val === true, {
      message: "Vous devez accepter la politique de confidentialité"
    })
  ),
});

export const server = {
  sendContactEmail: defineAction({
    accept: "form",
    input: contactSchema,
    handler: async (input) => {
      console.log("Données reçues:", input);
      
      try {        
        // Configuration du transporteur Nodemailer pour Gmail
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // true pour 465, false pour les autres ports
          auth: {
            user: import.meta.env.EMAIL_USER,
            pass: import.meta.env.EMAIL_APP_PASSWORD,
          },
          debug: true, 
          logger: true, 
        });

        await transporter.verify();

        // Configuration du mail
        const mailOptions = {
          from: {
            name: 'Formulaire de Contact',
            address: import.meta.env.EMAIL_USER,
          },
          to: import.meta.env.CONTACT_EMAIL,
          subject: `Nouveau message de ${input.firstName} ${input.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                Nouveau message
              </h2>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #007bff; margin-top: 0;">Informations du contact</h3>
                <p><strong>Nom :</strong> ${input.name}</p>
                <p><strong>Prénom :</strong> ${input.firstName}</p>
                <p><strong>Email :</strong> <a href="mailto:${input.email}">${input.email}</a></p>
                <p><strong>Téléphone :</strong> <a href="tel:${input.tel}">${input.tel}</a></p>
              </div>

              <div style="background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px;">
                <h3 style="color: #007bff; margin-top: 0;">Message</h3>
                <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">
${input.message}
                </div>
              </div>

              <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 5px; font-size: 12px; color: #666;">
                <p><strong>Informations techniques :</strong></p>
                <p>Date d'envoi : ${new Date().toLocaleString('fr-FR')}</p>
                <p>Consentement accepté : Oui</p>
              </div>
            </div>
          `,
          text: `
Nouveau message du formulaire de contact

INFORMATIONS DU CONTACT :
Nom : ${input.name}
Prénom : ${input.firstName}
Email : ${input.email}
Téléphone : ${input.tel}

MESSAGE :
${input.message}

---
Date d'envoi : ${new Date().toLocaleString('fr-FR')}
Consentement accepté : Oui
          `,
          replyTo: input.email, // Permet de répondre directement au visiteur
        };

        // Email de confirmation pour l'expéditeur
        const confirmationMail = {
          from: {
            name: 'Votre Site Web',
            address: import.meta.env.EMAIL_USER,
          },
          to: input.email,
          subject: 'Confirmation de réception de votre message',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
                Message bien reçu !
              </h2>
              
              <p>Bonjour ${input.firstName},</p>
              
              <p>Nous avons bien reçu votre message et vous en remercions. Notre équipe vous répondra dans les plus brefs délais.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">Récapitulatif de votre message :</h3>
                <p><strong>Sujet :</strong> Demande de contact</p>
                <p><strong>Date d'envoi :</strong> ${new Date().toLocaleString('fr-FR')}</p>
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
Bonjour ${input.firstName},

Nous avons bien reçu votre message et vous en remercions. Notre équipe vous répondra dans les plus brefs délais.

Récapitulatif :
- Sujet : Demande de contact  
- Date d'envoi : ${new Date().toLocaleString('fr-FR')}

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
        console.error("Erreur lors de l'envoi de l'email:", emailError);
        
        // Retourner une erreur spécifique selon le type d'erreur
        if (emailError.code === 'EAUTH') {
          throw new ActionError({
            code: "UNAUTHORIZED",
            message: "Erreur d'authentification email. Vérifiez vos identifiants.",
          });
        } else if (emailError.code === 'ECONNECTION') {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR", 
            message: "Impossible de se connecter au serveur email.",
          });
        } else {
          throw new ActionError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Erreur lors de l'envoi de l'email: ${emailError.message}`,
          });
        }
      }
    },
  }),
};