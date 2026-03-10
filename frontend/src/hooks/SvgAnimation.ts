// File: frontend/src/hooks/SvgAnimation.ts
// Purpose: Provides the svg animation hook or helper component.
// It packages reusable view or state behavior for other frontend modules.

"use client"
import { useEffect, useRef } from 'react';
import Vivus from 'vivus';

const SvgAnimation = (svgIconFile: string) => {
  const svgIconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivusInstance: Vivus | null = null;
    const hostElement = svgIconRef.current;

    if (!hostElement) return;

    const svgElement = hostElement.querySelector('.svg-icon');
    if (!svgElement) return;

    // Generate a unique ID if it doesn't exist
    if (!svgElement.id) {
      svgElement.id = `vivus-${Math.random().toString(36).slice(2, 11)}`;
    }
    const svgId = svgElement.id;
    const svgIcon = svgElement.getAttribute('data-svg-icon') || svgIconFile;

    if (svgId && svgIcon) {
      vivusInstance = new Vivus(svgId, {
        duration: 80,
        file: svgIcon,
        onReady: (myVivus) => {
          const duplicateSvg = myVivus.el.parentElement?.querySelectorAll('svg');
          if (duplicateSvg && duplicateSvg.length > 1) {
            duplicateSvg[0].remove();
          }
        }
      });

      const handleMouseEnter = () => {
        vivusInstance?.reset().play();
      };

      hostElement.addEventListener('mouseenter', handleMouseEnter);

      return () => {
        hostElement.removeEventListener('mouseenter', handleMouseEnter);
        vivusInstance?.stop().destroy();
      };
    }
  }, [svgIconFile]);

  return svgIconRef;
};

export default SvgAnimation;

