import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import style from "../style/components/infoCard.module.scss";

export default function InfoCard({ card, index }) {
  const { link, title, text, alt } = card;
  const [isHidden, setIsHidden] = useState(false);

  const toggleHidden = () => {
    console.log("Toggle clicked, isHidden:", isHidden);
    setIsHidden((prev) => !prev);
  };

  const offsetClass = style[`offset_${index}`];
  const divRef = useRef(null);

  return (
    <div
      ref={divRef}
      className={clsx(style.infocard, offsetClass)}
    >
        <img
          src={link}
          alt={alt}
          className={style.infocard_image}
          onClick={toggleHidden}  // Ajout du onClick ici si nécessaire
          style={{ cursor: 'pointer' }}  // Indication visuelle
        />
        <div
          className={`${style.infocard_text_container} ${
            isHidden ? style.infocard_text_container_hidden : ""
          }`}
        >
          <h2 className={style.infocard_title}>{title}</h2>
          <p className={style.infocard_text}>{text}</p>
          <span 
            className={style.infocard_text_cross} 
            onClick={toggleHidden}
            style={{ cursor: 'pointer' }}  // Indication visuelle
          >
            X
          </span>
        </div>
        <div
          className={`${style.infocard_learnMore} ${
            isHidden ? style.infocard_learnMore_hidden : ""
          }`} 
          onClick={toggleHidden}
          style={{ cursor: 'pointer' }}  // Indication visuelle
        >
          <p>{title}</p>
        </div>
    </div>
  );
}