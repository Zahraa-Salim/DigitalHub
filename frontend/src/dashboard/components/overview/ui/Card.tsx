// File: frontend/src/dashboard/components/overview-mock/ui/Card.tsx
// Purpose: Renders the overview mock card primitive for dashboard demos.
// It supports the mock overview panels with small reusable UI building blocks.

import React from 'react';

export function Card({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-lg border shadow-sm ${className}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', ...style }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`p-6 pb-3 ${className}`} style={style}>{children}</div>;
}

export function CardTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

