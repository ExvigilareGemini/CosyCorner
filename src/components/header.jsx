import { useEffect, useState } from "react";
import { headerProps } from "../props/headerProps";
import style from "../style/components/header.module.scss";
import Logo from "./logo";

export default function ScrollHeader() {
  const props = headerProps;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={style.header}>
      <div
        className={`${style.link_container} ${
          scrolled ? style.link_container_scrolled : ""
        }`}
      >
        {props.links.map((link) => (
          <a className={style.link} href={link.href} key={link.href}>
            {link.name}
          </a>
        ))}
      </div>{" "}
      <Logo scrolled={scrolled} />{" "}
    </header>
  );
}
