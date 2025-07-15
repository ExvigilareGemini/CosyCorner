import style from "@/style/components/formuleElement.module.scss";

const button = document.querySelector("[data-button]");
const images = document.querySelectorAll('[data-movable="image"]');
const texts = document.querySelectorAll('[data-movable="text"]');
const hiders = document.querySelectorAll('[data-movable="hider"]');

button?.addEventListener("click", () => {
  images.forEach((el) => {
    el.classList.toggle(style.moved);
  });

  texts.forEach((el) => {
    el.classList.toggle(style.moved);
  });
  hiders.forEach((el) => {
    el.classList.toggle(style.moved);
  });
});
