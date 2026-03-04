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
    let cancelled = false;

    const fetchAndInjectSvg = async () => {
      const currentImg = imgRef.current;
      if (!currentImg) return;

      // ✅ ضمان المسار يكون ROOT absolute
      const safeSrc = src.startsWith("/") ? src : `/${src}`;

      try {
        const response = await fetch(safeSrc);
        if (!response.ok || cancelled) return;

        const svgText = await response.text();
        const div = document.createElement("div");
        div.innerHTML = svgText;

        const svgElement = div.querySelector("svg");
        if (!svgElement || cancelled || !currentImg.isConnected) return;
        if (!(svgElement instanceof SVGSVGElement)) return;

        svgElement.setAttribute("class", currentImg.getAttribute("class") || "");
        if (!svgElement.id) {
          svgElement.id = `injectable-vivus-${Math.random().toString(36).slice(2, 11)}`;
        }

        currentImg.replaceWith(svgElement);

        const vivus = new Vivus(svgElement.id, {
          duration: 80,
          type: "oneByOne",
        });

        const handleMouseEnter = () => {
          vivus.reset().play();
        };

        svgElement.addEventListener("mouseenter", handleMouseEnter);
      } catch (err) {
        console.error("SVG load failed:", err);
      }
    };

    fetchAndInjectSvg();

    return () => {
      cancelled = true;
    };
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
