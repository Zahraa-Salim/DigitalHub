// File: src/components/homes/home-one/CurvedCircle.tsx
// Purpose: UI component responsible for rendering part of the interface (homes/home-one/CurvedCircle.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
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


