// File: frontend/src/components/homes/home-one/CurvedCircle.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
"use client"
import React, { useEffect, useRef } from 'react';
import CircleType from 'circletype';

const CurvedCircle: React.FC = () => {

  const curvedCircleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (curvedCircleRef.current) {
      const circleType = new CircleType(curvedCircleRef.current);
      circleType.radius(280).dir(1); // Customize as needed
    }
  }, []);

  return (
    <div className="curved-circle" ref={curvedCircleRef}>
      * Education * System * can * Make * Change *
    </div>
  );
};

export default CurvedCircle;


