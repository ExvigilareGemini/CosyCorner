import { defineAction } from "astro:actions";
import { z } from "zod";
import nodemailer from "nodemailer";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Import DOMPurify and JSDOM conditionally
let DOMPurify;
let JSDOM;
let purify;

// We need to handle JSDOM differently in a server environment
try {
  // Dynamic imports to avoid issues during module initialization
  const jsdomModule = await import("jsdom");
  JSDOM = jsdomModule.JSDOM;

  const dompurifyModule = await import("dompurify");
  DOMPurify = dompurifyModule.default;

  // Create a virtual DOM for DOMPurify to use
  const window = new JSDOM("").window;
  purify = DOMPurify(window);
} catch (error) {
  console.error("Error initializing JSDOM or DOMPurify:", error);
  // Provide a fallback sanitizer function if JSDOM fails
  purify = {
    sanitize: (content) => {
      // Simple fallback sanitization
      return content
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },
  };
}

// Configuration du rate limiter : 3 tentatives par IP toutes les 15 minutes
const rateLimiter = new RateLimiterMemory({
  keyPrefix: "contact_form",
  points: 3, // Nombre de tentatives autorisées
  duration: 900, // 15 minutes en secondes
});

// Liste de mots suspects pour détecter le spam
const SUSPICIOUS_WORDS = [
  "viagra",
  "casino",
  "lottery",
  "bitcoin",
  "crypto",
  "investment",
  "loan",
  "credit",
  "debt",
  "winner",
  "congratulations",
  "prize",
];

// Schéma de validation Zod pour le téléphone dans le formulaire de contact
const globalPhoneSchema = z.string()
  .transform((val) => val.trim())
  .refine((val) => {
    // Supprime tous les caractères non numériques sauf le +
    const cleaned = val.replace(/[^\+0-9]/g, '');
    
    // Vérifie si commence par + (international) ou par un chiffre
    const hasValidStart = /^[\+0-9]/.test(cleaned);
    
    // Vérifie la longueur (7-15 chiffres selon ITU-T E.164)
    const digitCount = cleaned.replace(/\+/, '').length;
    const hasValidLength = digitCount >= 7 && digitCount <= 15;
    
    return hasValidStart && hasValidLength && cleaned.length > 0;
  }, {
    message: "Format de numéro de téléphone international invalide"
  });

// Schéma de validation Zod - sécurise et valide toutes les entrées
const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .regex(
      /^[a-zA-ZÀ-ÿ\s\-']+$/,
      "Le nom contient des caractères non autorisés"
    ),

  firstName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .regex(
      /^[a-zA-ZÀ-ÿ\s\-']+$/,
      "Le prénom contient des caractères non autorisés"
    ),

  email: z
    .string()
    .email("Adresse email invalide")
    .max(254, "Email trop long")
    .refine(
      (email) => !email.includes("\n") && !email.includes("\r"),
      "Caractères interdits dans l'email"
    ),

    tel: globalPhoneSchema,

  message: z
    .string()
    .min(10, "Le message doit contenir au moins 10 caractères")
    .max(2000, "Le message ne peut pas dépasser 2000 caractères")
    .refine(
      (message) =>
        !SUSPICIOUS_WORDS.some((word) => message.toLowerCase().includes(word)),
      "Contenu suspect détecté"
    ),

  // Champ honeypot - doit être vide (détection de bots)
  website: z
    .string()
    .max(0, "Champ honeypot détecté - bot suspecté")
    .optional(),

  // Timestamp pour vérifier que la soumission n'est pas trop rapide
  timestamp: z.string().refine((ts) => {
    const submitTime = parseInt(ts);
    const now = Date.now();
    const timeSpent = now - submitTime;
    return timeSpent >= 3000; // Au moins 3 secondes
  }, "Soumission trop rapide - bot suspecté"),
});

// Configuration du transporteur email sécurisé
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    // Utilisation d'un service managé sécurisé (Gmail dans cet exemple)
    service: "gmail",
    auth: {
      user: import.meta.env.EMAIL_USER,
      pass: import.meta.env.EMAIL_APP_PASSWORD, // Mot de passe d'application, pas le mot de passe principal
    },
    // Configuration de sécurité supplémentaire
    secure: true,
    tls: {
      rejectUnauthorized: true,
    },
  });
};

// Fonction pour nettoyer et sécuriser le contenu
const sanitizeContent = (content: string): string => {
  // Supprime les caractères CRLF pour éviter l'injection d'headers email
  const noCRLF = content.replace(/[\r\n]/g, " ");
  // Purification HTML pour éviter les injections de script
  return purify.sanitize(noCRLF, { ALLOWED_TAGS: [] });
};

// Action principale pour envoyer l'email de contact
export const server = {
  sendContactEmail: defineAction({
    accept: "form",
    input: contactSchema,
    handler: async (input, context) => {
      try {
        // Récupération de l'IP du client pour le rate limiting
        const clientIP = context.clientAddress || "unknown";

        // Vérification du rate limiting - bloque les tentatives excessives
        try {
          await rateLimiter.consume(clientIP);
        } catch (rateLimiterRes) {
          throw new Error(
            "Trop de tentatives. Veuillez attendre avant de réessayer."
          );
        }

        // Nettoyage et sécurisation de toutes les données d'entrée
        const sanitizedData = {
          name: sanitizeContent(input.name.trim()),
          firstName: sanitizeContent(input.firstName.trim()),
          email: sanitizeContent(input.email.trim().toLowerCase()),
          tel: sanitizeContent(input.tel.trim()),
          message: sanitizeContent(input.message.trim()),
        };

        // Validation supplémentaire : vérification de la longueur après nettoyage
        if (sanitizedData.message.length < 10) {
          throw new Error("Message trop court après nettoyage");
        }

        // Création du transporteur email sécurisé
        const transporter = createEmailTransporter();

        // Configuration de l'email avec headers sécurisés
        const mailOptions = {
          from: import.meta.env.EMAIL_USER, // Email vérifié du service
          to: import.meta.env.CONTACT_EMAIL || import.meta.env.EMAIL_USER, // Email de destination
          // Corps de l'email en texte brut pour éviter les injections HTML
          text: `
Nouveau message du formulaire de contact

Nom: ${sanitizedData.name}
Prénom: ${sanitizedData.firstName}
Email: ${sanitizedData.email}
Téléphone: ${sanitizedData.tel}
Message:
${sanitizedData.message}

---
Email reçu le: ${new Date().toLocaleString("fr-FR")}
IP: ${clientIP}
          `,
          // Email de réponse sécurisé
          replyTo: sanitizedData.email,
          // Headers de sécurité supplémentaires
          headers: {
            "X-Mailer": "Astro Contact Form",
            "X-Priority": "3",
            "X-MSMail-Priority": "Normal",
          },
        };

        console.log(111);
        console.log(import.meta.env.EMAIL_APP_PASSWORD);

        // Envoi de l'email avec gestion d'erreur
        await transporter.sendMail(mailOptions);

        // Log sécurisé (sans données sensibles)
        console.log(
          `Email de contact envoyé depuis ${clientIP} à ${new Date().toISOString()}`
        );

        // Retour de succès
        return {
          success: true,
          message: "Votre message a été envoyé avec succès!",
        };
      } catch (error) {
        // Log d'erreur sécurisé (sans exposer d'informations sensibles)
        console.error(
          "Erreur lors de l'envoi de l'email:",
          error instanceof Error ? error.message : "Erreur inconnue"
        );

        // Message d'erreur générique pour éviter la fuite d'informations
        throw new Error(
          "Une erreur est survenue lors de l'envoi du message. Veuillez réessayer plus tard."
        );
      }
    },
  }),
};
