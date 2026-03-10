// File: frontend/src/dashboard/components/ValidationMessage.tsx
// Purpose: Renders the dashboard validation message component.
// It packages reusable admin UI and behavior for dashboard pages.

import React from 'react';
import { AlertCircle, CheckCircle, InfoIcon } from 'lucide-react';

interface ValidationMessageProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  details?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  type,
  message,
  details,
  dismissible = false,
  onDismiss,
}) => {
  const icons = {
    error: <AlertCircle size={18} />,
    success: <CheckCircle size={18} />,
    warning: <AlertCircle size={18} />,
    info: <InfoIcon size={18} />,
  };

  return (
    <div className={`validation-message validation-message--${type}`} role="alert">
      <div className="validation-message__content">
        <div className="validation-message__icon">
          {icons[type]}
        </div>
        <div className="validation-message__text">
          <p className="validation-message__title">{message}</p>
          {details && <p className="validation-message__details">{details}</p>}
        </div>
      </div>
      {dismissible && onDismiss && (
        <button
          className="validation-message__close"
          onClick={onDismiss}
          type="button"
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
    </div>
  );
};

