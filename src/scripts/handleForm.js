import { actions, isInputError } from "astro:actions";
import style from "../style/components/contactForm.module.scss";
import styleNotif from "@/style/components/notification.module.scss";

const form = document.querySelector("form");
const notifSuccess = document.querySelector(`.${styleNotif.notification}`);
const notifError = document.querySelector(`.${styleNotif.notificationError}`);
const closeBtn = document.querySelector(
  `.${styleNotif.notification_closeButton}`
);
const closeBtnError = document.querySelector(
  `.${styleNotif.notificationError_closeButton}`
);

const registeredErrors = new Set();

// Fonctions de validation côté client (miroir du schéma Zod)
const clientValidation = {
  name: (value) => {
    if (!value || value.trim().length < 2) {
      return "Le nom doit contenir au moins 2 caractères";
    }
    if (value.length > 100) {
      return "Le nom ne peut pas dépasser 100 caractères";
    }
    return null;
  },

  firstName: (value) => {
    if (!value || value.trim().length < 2) {
      return "Le prénom doit contenir au moins 2 caractères";
    }
    if (value.length > 100) {
      return "Le prénom ne peut pas dépasser 100 caractères";
    }
    return null;
  },

  email: (value) => {
    if (!value) {
      return "L'email est requis";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Adresse email invalide";
    }
    if (value.length > 254) {
      return "Email trop long";
    }
    return null;
  },

  tel: (value) => {
    if (!value) {
      return "Le téléphone est requis";
    }
    const cleaned = value.replace(/[^\+0-9]/g, "");
    const hasValidStart = /^[\+0-9]/.test(cleaned);
    const digitCount = cleaned.replace(/\+/, "").length;
    const hasValidLength = digitCount >= 7 && digitCount <= 15;

    if (!hasValidStart || !hasValidLength || cleaned.length === 0) {
      return "Format de numéro de téléphone international invalide";
    }
    return null;
  },

  message: (value) => {
    if (!value || value.trim().length < 10) {
      return "Le message doit contenir au moins 10 caractères";
    }
    if (value.length > 2000) {
      return "Le message ne peut pas dépasser 2000 caractères";
    }
    return null;
  },

  consent: (checked) => {
    if (!checked) {
      return "Vous devez accepter la politique de confidentialité";
    }
    return null;
  },
};

function addErrorToField(field, message) {
  const errorInput = document.querySelector(`#${field}`);
  const errorMessage = document.querySelector(`#${field}_errorMessage`);
  const errorLabel = document.querySelector(`label[for=${field}]`);

  if (errorInput) errorInput.classList.add(style.wrong);
  if (errorLabel) errorLabel.classList.add(style.wrong_label);
  if (errorMessage) {
    errorMessage.style.opacity = "1";
    errorMessage.innerHTML = message;
  }
}

function removeErrorFromField(field) {
  const errorInput = document.querySelector(`#${field}`);
  const errorMessage = document.querySelector(`#${field}_errorMessage`);
  const errorLabel = document.querySelector(`label[for=${field}]`);

  if (errorInput) errorInput.classList.remove(style.wrong);
  if (errorLabel) errorLabel.classList.remove(style.wrong_label);
  if (errorMessage) {
    errorMessage.style.opacity = "0";
    errorMessage.innerHTML = "";
  }
}

function validateFormClientSide() {
  const fields = ["name", "firstName", "email", "tel", "message", "consent"];
  let hasErrors = false;
  const errors = {};

  fields.forEach((fieldName) => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      const value = field.type === "checkbox" ? field.checked : field.value;
      const error = clientValidation[fieldName]?.(value);
      if (error) {
        errors[fieldName] = error;
        hasErrors = true;
        addErrorToField(fieldName, error);
        registeredErrors.add(fieldName);
      } else {
        removeErrorFromField(fieldName);
        registeredErrors.delete(fieldName);
      }
    }
  });

  return { hasErrors, errors };
}

// Validation en temps réel sur les champs
["name", "firstName", "email", "tel", "message"].forEach((fieldName) => {
  const field = form?.querySelector(`[name="${fieldName}"]`);
  if (field) {
    field.addEventListener("blur", () => {
      const value = field.value;
      const error = clientValidation[fieldName]?.(value);
      if (error && value) {
        // Ne pas afficher d'erreur sur un champ vide
        addErrorToField(fieldName, error);
        registeredErrors.add(fieldName);
      } else {
        removeErrorFromField(fieldName);
        registeredErrors.delete(fieldName);
      }
    });
    // Nettoyer l'erreur quand l'utilisateur tape
    field.addEventListener("input", () => {
      if (registeredErrors.has(fieldName)) {
        removeErrorFromField(fieldName);
        registeredErrors.delete(fieldName);
      }
    });
  }
});

// Validation du consentement
const consentField = form?.querySelector('[name="consent"]');
if (consentField) {
  consentField.addEventListener("change", () => {
    const error = clientValidation.consent(consentField.checked);
    if (error) {
      addErrorToField("consent", error);
      registeredErrors.add("consent");
    } else {
      removeErrorFromField("consent");
      registeredErrors.delete("consent");
    }
  });
}

// Make the toaster notification appear
// isError = true make the error box appear
function showNotif(isError = false) {
  if (isError) {
    notifError.classList.add(styleNotif.notification_entering);
  } else {
    notifSuccess.classList.add(styleNotif.notification_entering);
  }
}

// Make the toaster notification disappear
// isError = true make the error box disappear
function hideNotif(isError = false) {
  if (isError) {
    notifError.classList.remove(styleNotif.notification_entering);
  } else {
    notifSuccess.classList.remove(styleNotif.notification_entering);
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    // Validation côté client avant l'envoi
    const { hasErrors, errors } = validateFormClientSide();
    if (hasErrors) {
      console.log("Erreurs de validation côté client:", errors);
      return;
    }

    // Envoi au serveur seulement si validation OK
    const formData = new FormData(form);
    const { error, data } = await actions.sendContactEmail(formData);

    // Gestion de la réponse serveur
    if (isInputError(error) && error?.fields) {
      console.log("Erreurs de validation serveur :", error.fields);
      Object.keys(error.fields).forEach((field) => {
        const serverError = error.fields[field][0]; // Premier message d'erreur
        addErrorToField(field, serverError);
        registeredErrors.add(field);
      });
    } else if (error) {
      // console.error("Erreur serveur:", error);
      // Afficher une erreur générale à l'utilisateur
      showNotif(true);
      setTimeout(() => {
        hideNotif(true);
      }, 5000);
    } else {
      // Nettoyer toutes les erreurs et réinitialiser
      registeredErrors.forEach((field) => removeErrorFromField(field));
      registeredErrors.clear();
      form.reset();

      showNotif();
      setTimeout(() => {
        hideNotif();
      }, 5000);
    }
  } catch (err) {
    // console.error("Erreur inattendue:", err);
    showNotif(true);
    setTimeout(() => {
      hideNotif(true);
    }, 5000);
  }
});

closeBtn.addEventListener("click", () => {
  hideNotif();
});

closeBtnError.addEventListener("click", () => {
  hideNotif(true);
});
