import { useEffect, useState } from "react";
import { headerProps } from "../props/headerProps";
import style from "../style/components/header.module.scss";
import Logo from "./logo";

export default function ScrollHeader() {
  const props = headerProps;
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  // Change class of logo
  // Logo's class change when scrolling more than 100px
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    handleScroll(); // initial state
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Change class of links when scrolling
  // Link's class change when scrolling to their section
  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");
    
    // Function to determine which section is most visible in the viewport
    const determineActiveSection = () => {
      // Get the middle point of the viewport
      const viewportMiddle = window.innerHeight / 2;
      
      let mostVisibleSection = null;
      let maxVisibility = 0;
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        
        // Calculate how much of the section is visible in the viewport
        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(window.innerHeight, rect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        
        // Calculate how close the section is to the middle of the viewport
        const distanceFromMiddle = Math.abs((visibleTop + visibleBottom) / 2 - viewportMiddle);
        
        // Combine visibility and proximity to middle for a weighted score
        // Sections that are more visible and closer to the middle get higher scores
        const visibilityScore = visibleHeight * (1 - distanceFromMiddle / window.innerHeight);
        
        if (visibilityScore > maxVisibility) {
          maxVisibility = visibilityScore;
          mostVisibleSection = section;
        }
      });
      
      if (mostVisibleSection) {
        setActiveSection(mostVisibleSection.id);
      } else {
        setActiveSection("");
      }
    };
    
    // Call the function on scroll
    window.addEventListener("scroll", determineActiveSection);
    
    // Initial determination
    determineActiveSection();
    
    return () => {
      window.removeEventListener("scroll", determineActiveSection);
    };
  }, []);

  return (
    <header className={style.header}>
      <div
        className={`${style.link_container} ${
          scrolled ? style.link_container_scrolled : ""
        }`}
      >
        {props.links.map((link) => {
          const targetId = link.href.replace("#", "");
          const isActive = activeSection === targetId;

          return (
            <a
              key={link.href}
              href={link.href}
              className={`${style.link} ${isActive ? style.link_active : ""}`}
            >
              {link.name}
            </a>
          );
        })}
      </div>
      <Logo scrolled={scrolled} />
    </header>
  );
}
