// File: frontend/src/dashboard/components/QuickPreviewPanel.tsx
// Purpose: Renders the dashboard quick preview panel component.
// It packages reusable admin UI and behavior for dashboard pages.

import React from 'react';
import { X, ExternalLink } from 'lucide-react';

export interface PreviewField {
  label: string;
  value: string | number | boolean | null | undefined;
  type?: 'text' | 'html' | 'image' | 'url' | 'date' | 'boolean';
}

interface QuickPreviewPanelProps {
  isOpen: boolean;
  title: string;
  fields: PreviewField[];
  onClose: () => void;
  externalLink?: string;
  isLoading?: boolean;
}

export const QuickPreviewPanel: React.FC<QuickPreviewPanelProps> = ({
  isOpen,
  title,
  fields,
  onClose,
  externalLink,
  isLoading = false,
}) => {
  if (!isOpen) {
    return null;
  }

  const renderFieldValue = (field: PreviewField) => {
    const { value, type = 'text' } = field;

    if (value === null || value === undefined || value === '') {
      return <span className="text-muted">—</span>;
    }

    switch (type) {
      case 'html':
        return (
          <div
            className="preview-field__html"
            dangerouslySetInnerHTML={{ __html: String(value) }}
          />
        );
      case 'image':
        return (
          <img
            src={String(value)}
            alt={field.label}
            className="preview-field__image"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        );
      case 'url':
        return (
          <a href={String(value)} target="_blank" rel="noopener noreferrer" className="preview-field__url">
            {String(value)}
            <ExternalLink size={14} />
          </a>
        );
      case 'date':
        return <span>{new Date(String(value)).toLocaleDateString()}</span>;
      case 'boolean':
        return (
          <span className={value ? 'text-success' : 'text-danger'}>
            {value ? '✓ Yes' : '✗ No'}
          </span>
        );
      default: {
        const text = String(value);
        return text.length > 200 ? <p>{text.substring(0, 200)}...</p> : <p>{text}</p>;
      }
    }
  };

  return (
    <>
      <div className="quick-preview-overlay" onClick={onClose} aria-hidden="true" />
      <aside
        className="quick-preview-panel"
        role="complementary"
        aria-label="Quick preview panel"
        aria-modal="true"
      >
        <div className="quick-preview-panel__header">
          <h3 className="quick-preview-panel__title">{title}</h3>
          <button
            className="quick-preview-panel__close"
            onClick={onClose}
            aria-label="Close preview"
            title="Close preview"
          >
            <X size={20} />
          </button>
        </div>

        <div className="quick-preview-panel__content">
          {isLoading ? (
            <div className="quick-preview-panel__loading">
              <p>Loading preview...</p>
            </div>
          ) : (
            <div className="preview-fields">
              {fields.map((field, index) => (
                <div key={index} className="preview-field">
                  <dt className="preview-field__label">{field.label}</dt>
                  <dd className="preview-field__value">
                    {renderFieldValue(field)}
                  </dd>
                </div>
              ))}
            </div>
          )}
        </div>

        {externalLink && (
          <div className="quick-preview-panel__footer">
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary btn--sm"
            >
              <ExternalLink size={16} />
              View Full Page
            </a>
          </div>
        )}
      </aside>
    </>
  );
};

