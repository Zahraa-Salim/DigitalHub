// File: frontend/src/components/common/ScrollToTop.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
"use client";
import useSticky from "@/hooks/useSticky";
import { useState, useEffect } from "react";

const ScrollToTop = () => {
   const { sticky }: { sticky: boolean } = useSticky();

   const [showScroll, setShowScroll] = useState(false);

   const scrollTop = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
   };

   useEffect(() => {
      const handleScroll = () => {
         setShowScroll(window.pageYOffset > 400);
      };

      handleScroll();
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
   }, []);

   return (
      <>
         <button onClick={scrollTop} className={`scroll__top scroll-to-target ${sticky || showScroll ? "open" : ""}`} data-target="html">
            <i className="tg-flaticon-arrowhead-up"></i>
         </button>
      </>
   )
}

export default ScrollToTop;
