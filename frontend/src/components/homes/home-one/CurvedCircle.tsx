// File: frontend/src/components/homes/home-one/CurvedCircle.tsx
// Purpose: Renders the curved circle UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

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

