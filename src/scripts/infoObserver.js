import styleInfo from "../style/components/info.module.scss";
import styleCard from "../style/components/infoCard.module.scss";

const target = document.querySelector(`.${styleInfo.info_container}`);
const cardElements = document.querySelectorAll(`.${styleCard.infocard}`);
const titleElement = document.querySelector(`.${styleInfo.info_text_container}`)

const callback = (entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      cardElements.forEach((card) => card.classList.add(styleCard.isVisible));
      titleElement.classList.add(styleInfo.isVisible)
      observer.unobserve(entry.target);
    }
  });
};

const options = {
  root: null, // élément racine (null = viewport)
  rootMargin: "0px 0px 0px 0px", // marges autour du root
  threshold: 0.5, // déclenchement quand 50% de la cible est visible
};

const observer = new IntersectionObserver(callback, options);
observer.observe(target);
