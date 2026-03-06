// File: src/hooks/MotionAnimation.ts
// Purpose: Reusable React hook encapsulating shared state, side effects, or behavior.
// If you change this file: Changing return values, timing, or side effects can impact every component that consumes this hook.
"use client";
import { useEffect } from 'react';
import { TweenMax } from 'gsap';

const MotionAnimation = () => {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const wraps = document.querySelectorAll('.tg-motion-effects');
      wraps.forEach((wrap) => {
        const parallaxIt = (targetClass: string, movement: number) => {
          const target = wrap.querySelector(targetClass) as HTMLElement;
          if (!target) return;

          const bounds = wrap.getBoundingClientRect();
          const relX = e.clientX - bounds.left;
          const relY = e.clientY - bounds.top;
          const maxOffset = Math.abs(movement);
          const nextX = Math.max(
            -maxOffset,
            Math.min(maxOffset, ((relX - bounds.width / 2) / bounds.width) * movement)
          );
          const nextY = Math.max(
            -maxOffset,
            Math.min(maxOffset, ((relY - bounds.height / 2) / bounds.height) * movement)
          );

          TweenMax.to(target, 1, {
            x: nextX,
            y: nextY,
          });
        };

        parallaxIt('.tg-motion-effects1', 20);
        parallaxIt('.tg-motion-effects2', 5);
        parallaxIt('.tg-motion-effects3', -10);
        parallaxIt('.tg-motion-effects4', 30);
        parallaxIt('.tg-motion-effects5', -8);
        parallaxIt('.tg-motion-effects6', -20);
        parallaxIt('.tg-motion-effects7', 40);
      });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
};

export default MotionAnimation;
