// File: frontend/src/dashboard/components/FormGroup.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import React from 'react';

interface FormGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showDivider?: boolean;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  title,
  description,
  children,
  className = '',
  showDivider = true,
}) => {
  return (
    <>
      <div className={`form-group ${className}`}>
        <div className="form-group__header">
          <h4 className="form-group__title">{title}</h4>
          {description && <p className="form-group__description">{description}</p>}
        </div>
        <div className="form-group__content">
          {children}
        </div>
      </div>
      {showDivider && <hr className="form-divider" />}
    </>
  );
};
