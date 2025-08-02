import { useState, useRef, useEffect  } from "react";
import clsx from 'clsx';
import style from "../style/components/infoCard.module.scss";


export default function InfoCard({ card, index }) {
  const { link, title, text, alt } = card;
  const [isHidden, setIsHidden] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const toggleHidden = () => {
    setIsHidden((prev) => !prev);
  };

  const offsetClass = style[`offset_${index}`];

  const divRef = useRef(null);

useEffect(() => {
  if (!divRef.current) return;

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(divRef.current);

  return () => observer.disconnect();
}, []);

  return (
    <div ref={divRef}
            className={clsx(
        style.infocard,
        offsetClass || "",
        {
          [style.infocard_hidden]: isHidden,
          [style.isVisible]: isVisible
        }
      )}
    >
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