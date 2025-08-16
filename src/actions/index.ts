import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";

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
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),

  firstName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),

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
    .max(2000, "Le message ne peut pas dépasser 2000 caractères"),

  // Champ honeypot - doit être vide (détection de bots)
  website: z
    .string()
    .max(0, "Champ honeypot détecté - bot suspecté")
    .optional(),
});


export const server = {
  sendContactEmail: defineAction({
    accept: "form",
    input: contactSchema,
    handler: async ({ email}) => {
      console.log(111)
      return "Yeah baby"
      // throw new ActionError({
      //   code:"NOT_FOUND",
      //   message: "Message de test",
      // })
    },
  }),
};