import style from "@/style/components/formuleElement.module.scss";

const images = document.querySelectorAll('[data-movable="image"]');
const texts = document.querySelectorAll('[data-movable="text"]');
const hiders = document.querySelectorAll('[data-movable="hider"]');

const targets = document.querySelectorAll(`.${style.formuleElement}, .${style.formuleElementRight}`);

const callback = (entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.childNodes[1].classList.add(style.moved);
      entry.target.childNodes[3].classList.add(style.moved);
      entry.target.childNodes[5].classList.add(style.moved);
      observer.unobserve(entry.target);
    }
  });
}

const options = {
  root: null, // élément racine (null = viewport)
  rootMargin: "0px 0px 0px 0px", // marges autour du root
  threshold: 0.8, // déclenchement quand 50% de la cible est visible
};

const observer = new IntersectionObserver(callback, options);



targets.forEach((target) => {observer.observe(target)}) 


