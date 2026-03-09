import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'gray'
  | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  onClick?: () => void;
}

export function Badge({
  children,
  variant = 'default',
  className = '',
  onClick,
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    green: 'bg-green-50 text-green-700 border border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    red: 'bg-red-50 text-red-700 border border-red-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </span>
  );
}
