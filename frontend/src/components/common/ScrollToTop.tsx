// File: frontend/src/components/common/ScrollToTop.tsx
// Purpose: Renders the shared scroll to top UI element used across the site.
// It keeps common presentation behavior reusable between pages and sections.

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

