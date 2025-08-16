import { actions, isInputError } from "astro:actions";
import { navigate } from "astro:transitions/client";

const form = document.querySelector("form");
form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const { error, data } = await actions.sendContactEmail(formData);

  if (isInputError(error)) {
    // console.log("---isInputError---");
    // console.log(isInputError(error));
    // console.log("---error---");
    // console.log(error);
    // console.log("---error.fields---");
    // console.log(error.fields);
    // console.log(Object.keys(error.fields));
    const errorFields = Object.keys(error.fields)
// Pour l'instant, applique un display:none à tous les inputs ayant une 
// erreur provenant de l'astro action 
      errorFields.forEach( field => {
        // sélectionne l'input correspondant au champ selon l'id et display:none
        document.querySelector(`#${field}`).style.display = "none"
        console.log(error.fields[field])
       });
  } else {
    console.log(data)
  }
});
