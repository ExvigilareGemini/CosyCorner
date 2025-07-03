import { useState, useRef, useEffect } from "react";
import style from "../style/components/infoCard.module.scss";

export default function InfoCard({ card, index }) {
  const { link, title, text, alt } = card;
  const [isHidden, setIsHidden] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  const toggleHidden = () => {
    setIsHidden((prev) => !prev);
  };

  // Synchroniser avec la classe ajoutée par l'Intersection Observer
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          setIsVisible(element.classList.contains(style.isVisible));
        }
      });
    });

    observer.observe(element, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const offsetClass = style[`offset_${index}`];

  return (
    <div
      ref={cardRef}
      className={`${style.infocard} ${isHidden ? style.infocard_hidden : ""} ${offsetClass || ""} ${isVisible ? style.isVisible : ''}`}
    >
      {/* Reste du composant identique */}
      <img src={link} alt={alt} className={style.infocard_image}></img>
      <div
        className={`${style.infocard_text_container} ${
          isHidden ? style.infocard_text_container_hidden : ""
        }`}
      >
        <h2 className={style.infocard_title}>{title}</h2>
        <p className={style.infocard_text}>{text}</p>
        <span className={style.infocard_text_cross} onClick={toggleHidden}>X</span>
      </div>
      <div className={`${style.infocard_learnMore} ${
          isHidden ? style.infocard_learnMore_hidden : ""
        }`} onClick={toggleHidden}>
        <p>{title}</p>
      </div>
    </div>
  );
}