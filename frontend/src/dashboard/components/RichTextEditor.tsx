// File: frontend/src/dashboard/components/RichTextEditor.tsx
// Purpose: Renders the dashboard rich text editor component.
// It packages reusable admin UI and behavior for dashboard pages.

import React from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter content here...',
  maxLength,
  label,
  hint,
  disabled = false,
}) => {
  const plainValue = String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ");

  const handleChange = (nextValue: string) => {
    if (maxLength && nextValue.length > maxLength) {
      return;
    }
    onChange(nextValue);
  };

  const charCount = plainValue.length;
  const maxLengthDisplay = maxLength ? ` / ${maxLength}` : '';

  return (
    <div className="rich-text-editor-wrapper">
      {label && <label className="field__label">{label}</label>}
      <div className="rich-text-editor">
        <textarea
          className="field__input"
          value={plainValue}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={8}
        />
      </div>
      <div className="rich-text-editor-footer">
        {hint && <small className="field__hint">{hint}</small>}
        {maxLength && (
          <small className="char-count">
            {charCount}{maxLengthDisplay} characters
          </small>
        )}
      </div>
    </div>
  );
};

