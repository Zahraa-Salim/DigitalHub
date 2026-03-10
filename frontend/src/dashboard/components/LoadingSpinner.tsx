// File: frontend/src/dashboard/components/LoadingSpinner.tsx
// Purpose: Renders the dashboard loading spinner component.
// It packages reusable admin UI and behavior for dashboard pages.

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  count?: number;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1em',
  count = 1,
  circle = false,
  className = '',
  style = {},
}) => {
  const baseClass = `skeleton ${circle ? 'skeleton--circle' : ''} ${className}`;

  const baseStyle: React.CSSProperties = {
    width,
    height,
    display: 'block',
    marginBottom: count > 1 ? '0.5em' : '0',
    ...style,
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={baseClass}
          style={baseStyle}
          aria-busy="true"
          aria-hidden="true"
        />
      ))}
    </>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', color }) => {
  return (
    <div className={`loading-spinner loading-spinner--${size}`} role="status" aria-label="Loading">
      <div className="loading-spinner__inner" style={color ? { borderColor: color } : {}} />
    </div>
  );
};

