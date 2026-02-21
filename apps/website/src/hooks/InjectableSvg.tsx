// File: src/hooks/InjectableSvg.tsx
// Purpose: Reusable React hook encapsulating shared state, side effects, or behavior.
// If you change this file: Changing return values, timing, or side effects can impact every component that consumes this hook.
"use client";

import React, { useEffect, useRef } from "react";
import Vivus from "vivus";

interface InjectableSvgProps {
  src: string;
  alt?: string;
  className?: string;
}

const InjectableSvg: React.FC<InjectableSvgProps> = ({
  src,
  alt = "",
  className = "",
}) => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const fetchAndInjectSvg = async () => {
      if (!imgRef.current) return;

      // ✅ ضمان المسار يكون ROOT absolute
      const safeSrc = src.startsWith("/") ? src : `/${src}`;

      try {
        const response = await fetch(safeSrc);
        if (!response.ok) return;

        const svgText = await response.text();
        const div = document.createElement("div");
        div.innerHTML = svgText;

        const svgElement = div.querySelector("svg");
        if (!svgElement) return;

        svgElement.setAttribute(
          "class",
          imgRef.current.getAttribute("class") || ""
        );

        imgRef.current.replaceWith(svgElement);

        const vivus = new Vivus(svgElement as any, {
          duration: 80,
          type: "oneByOne",
        });

        svgElement.addEventListener("mouseenter", () => {
          vivus.reset().play();
        });
      } catch (err) {
        console.error("SVG load failed:", err);
      }
    };

    fetchAndInjectSvg();
  }, [src]);

  // ✅ img src آمن
  const finalSrc = src.startsWith("/") ? src : `/${src}`;

  return (
    <img
      ref={imgRef}
      src={finalSrc}
      alt={alt}
      className={`injectable ${className}`}
    />
  );
};

export default InjectableSvg;
