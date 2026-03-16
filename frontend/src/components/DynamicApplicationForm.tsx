"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { PublicFormField } from "@/lib/publicApi";

type FieldOption = {
  label: string;
  value: string;
};

type AnswersMap = Record<string, unknown>;
type FieldErrors = Record<string, string>;

export type DynamicApplicationFormProps = {
  fields: PublicFormField[];
  onSubmit: (answers: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
  error: string;
  submitLabel?: string;
  initialAnswers?: Record<string, unknown>;
  hiddenFieldNames?: string[];
  formKey?: string | number;
};

const FILE_ACCEPT =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.heic,.txt,.rtf,.zip";

const INPUT_TYPE_BY_FIELD: Record<string, string> = {
  text: "text",
  email: "email",
  phone: "tel",
  url: "url",
  number: "number",
  date: "date",
};

const parseFieldOptions = (options: unknown): FieldOption[] => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => {
      if (typeof option === "string") {
        const trimmed = option.trim();
        return trimmed ? { label: trimmed, value: trimmed } : null;
      }

      if (option && typeof option === "object") {
        const source = option as { label?: unknown; value?: unknown };
        const label = typeof source.label === "string" ? source.label.trim() : "";
        const value = typeof source.value === "string" ? source.value.trim() : "";
        if (label && value) {
          return { label, value };
        }
      }

      return null;
    })
    .filter((option): option is FieldOption => Boolean(option));
};

const hasOptionList = (field: PublicFormField) => parseFieldOptions(field.options).length > 0;

const buildInitialAnswers = (fields: PublicFormField[], initialAnswers?: AnswersMap) => {
  const defaults: AnswersMap = {};

  fields.forEach((field) => {
    if (initialAnswers && Object.prototype.hasOwnProperty.call(initialAnswers, field.name)) {
      defaults[field.name] = initialAnswers[field.name];
      return;
    }

    if (field.type === "checkbox") {
      defaults[field.name] = hasOptionList(field) ? [] : false;
      return;
    }

    if (field.type === "file") {
      defaults[field.name] = null;
      return;
    }

    defaults[field.name] = "";
  });

  return defaults;
};

const isMissingRequiredValue = (field: PublicFormField, value: unknown) => {
  if (field.type === "checkbox") {
    if (hasOptionList(field)) {
      return !Array.isArray(value) || value.length === 0;
    }
    return value !== true;
  }

  if (field.type === "file") {
    return !value;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return value === undefined || value === null;
};

const normalizeAnswersForSubmit = (fields: PublicFormField[], answers: AnswersMap) => {
  const normalized: AnswersMap = {};

  fields.forEach((field) => {
    const value = answers[field.name];

    if (field.type === "file") {
      if (value && typeof value === "object" && "name" in (value as Record<string, unknown>)) {
        normalized[field.name] = value;
      } else {
        normalized[field.name] = null;
      }
      return;
    }

    if (field.type === "number") {
      const raw = typeof value === "string" ? value.trim() : value;
      normalized[field.name] = raw === "" ? "" : raw;
      return;
    }

    normalized[field.name] = value;
  });

  return normalized;
};

export default function DynamicApplicationForm({
  fields,
  onSubmit,
  submitting,
  error,
  submitLabel = "Submit Application",
  initialAnswers,
  hiddenFieldNames,
  formKey,
}: DynamicApplicationFormProps) {
  const [answers, setAnswers] = useState<AnswersMap>(() => buildInitialAnswers(fields, initialAnswers));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const hiddenFields = useMemo(() => new Set(hiddenFieldNames ?? []), [hiddenFieldNames]);
  const visibleFields = useMemo(
    () => fields.filter((field) => field.is_enabled !== false && !hiddenFields.has(field.name)),
    [fields, hiddenFields],
  );

  useEffect(() => {
    setAnswers(buildInitialAnswers(fields, initialAnswers));
    setFieldErrors({});
  }, [fields, initialAnswers, formKey]);

  const updateAnswer = (fieldName: string, value: unknown) => {
    setAnswers((current) => ({ ...current, [fieldName]: value }));
    setFieldErrors((current) => {
      if (!current[fieldName]) {
        return current;
      }
      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    fields
      .filter((field) => field.is_enabled !== false)
      .forEach((field) => {
        if (!field.required) {
          return;
        }
        if (isMissingRequiredValue(field, answers[field.name])) {
          nextErrors[field.name] = `${field.label || field.name} is required.`;
        }
      });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSubmit(normalizeAnswersForSubmit(fields, answers));
      setFieldErrors({});
    } catch (submissionError) {
      if (
        submissionError &&
        typeof submissionError === "object" &&
        "fieldErrors" in submissionError &&
        submissionError.fieldErrors &&
        typeof submissionError.fieldErrors === "object"
      ) {
        setFieldErrors(submissionError.fieldErrors as FieldErrors);
      }
    }
  };

  return (
    <form className="apply-form" onSubmit={handleSubmit}>
      {error ? <p className="apply-form__status apply-form__status--error">{error}</p> : null}

      <div className="apply-form__grid">
        {visibleFields.map((field) => {
          const fieldId = `apply-field-${field.id}`;
          const options = parseFieldOptions(field.options);
          const invalid = Boolean(fieldErrors[field.name]);
          const controlClassName = invalid
            ? "apply-form__control apply-form__control--invalid"
            : "apply-form__control";

          if (field.type === "textarea") {
            return (
              <div className="apply-form__group" key={field.id}>
                <label className="apply-form__label" htmlFor={fieldId}>
                  {field.label}
                  {field.required ? <span className="apply-form__required">*</span> : null}
                </label>
                <textarea
                  id={fieldId}
                  className={`${controlClassName} apply-form__textarea`}
                  value={String(answers[field.name] ?? "")}
                  onChange={(event) => updateAnswer(field.name, event.target.value)}
                  placeholder={field.placeholder || field.label}
                  aria-invalid={invalid || undefined}
                />
                {fieldErrors[field.name] ? <p className="apply-form__error">{fieldErrors[field.name]}</p> : null}
              </div>
            );
          }

          if (field.type === "select") {
            return (
              <div className="apply-form__group" key={field.id}>
                <label className="apply-form__label" htmlFor={fieldId}>
                  {field.label}
                  {field.required ? <span className="apply-form__required">*</span> : null}
                </label>
                <div className="apply-form__select-wrap">
                  <select
                    id={fieldId}
                    className={controlClassName}
                    value={String(answers[field.name] ?? "")}
                    onChange={(event) => updateAnswer(field.name, event.target.value)}
                    aria-invalid={invalid || undefined}
                  >
                    <option value="">{field.placeholder || `Select ${field.label}`}</option>
                    {options.map((option) => (
                      <option key={`${field.id}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors[field.name] ? <p className="apply-form__error">{fieldErrors[field.name]}</p> : null}
              </div>
            );
          }

          if (field.type === "radio") {
            return (
              <div className="apply-form__group" key={field.id}>
                <p className="apply-form__label">
                  {field.label}
                  {field.required ? <span className="apply-form__required">*</span> : null}
                </p>
                <div className="apply-form__choice-list">
                  {options.map((option) => {
                    const checked = String(answers[field.name] ?? "") === option.value;
                    return (
                      <label
                        key={`${field.id}-${option.value}`}
                        className={checked ? "apply-form__choice apply-form__choice--selected" : "apply-form__choice"}
                      >
                        <input
                          className="apply-form__choice-input"
                          type="radio"
                          name={field.name}
                          value={option.value}
                          checked={checked}
                          onChange={() => updateAnswer(field.name, option.value)}
                        />
                        <span className="apply-form__choice-indicator apply-form__choice-indicator--radio" />
                        <span className="apply-form__choice-label">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                {fieldErrors[field.name] ? <p className="apply-form__error">{fieldErrors[field.name]}</p> : null}
              </div>
            );
          }

          if (field.type === "checkbox" && options.length > 0) {
            const selectedValues = Array.isArray(answers[field.name]) ? (answers[field.name] as string[]) : [];
            return (
              <div className="apply-form__group" key={field.id}>
                <p className="apply-form__label">
                  {field.label}
                  {field.required ? <span className="apply-form__required">*</span> : null}
                </p>
                <div className="apply-form__choice-list">
                  {options.map((option) => {
                    const checked = selectedValues.includes(option.value);
                    return (
                      <label
                        key={`${field.id}-${option.value}`}
                        className={checked ? "apply-form__choice apply-form__choice--selected" : "apply-form__choice"}
                      >
                        <input
                          className="apply-form__choice-input"
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const nextValues = event.target.checked
                              ? [...selectedValues, option.value]
                              : selectedValues.filter((value) => value !== option.value);
                            updateAnswer(field.name, nextValues);
                          }}
                        />
                        <span className="apply-form__choice-indicator apply-form__choice-indicator--checkbox" />
                        <span className="apply-form__choice-label">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                {fieldErrors[field.name] ? <p className="apply-form__error">{fieldErrors[field.name]}</p> : null}
              </div>
            );
          }

          if (field.type === "checkbox") {
            return (
              <div className="apply-form__group" key={field.id}>
                <label className="apply-form__checkbox-inline">
                  <input
                    type="checkbox"
                    checked={Boolean(answers[field.name])}
                    onChange={(event) => updateAnswer(field.name, event.target.checked)}
                  />
                  <span>
                    {field.label}
                    {field.required ? <span className="apply-form__required">*</span> : null}
                  </span>
                </label>
                {fieldErrors[field.name] ? <p className="apply-form__error">{fieldErrors[field.name]}</p> : null}
              </div>
            );
          }

          if (field.type === "file") {
            const fileValue = answers[field.name] as { name?: string } | null;
            return (
              <div className="apply-form__group" key={field.id}>
                <label className="apply-form__label" htmlFor={fieldId}>
                  {field.label}
                  {field.required ? <span className="apply-form__required">*</span> : null}
                </label>
                <label
                  className={invalid ? "apply-form__file apply-form__file--invalid" : "apply-form__file"}
                  htmlFor={fieldId}
                >
                  <span className="apply-form__file-icon" aria-hidden="true">
                    ↑
                  </span>
                  <span className="apply-form__file-title">Click to upload or drag and drop</span>
                  <span className="apply-form__file-copy">PDF, DOC, DOCX, PNG, JPG, or WEBP</span>
                  <input
                    id={fieldId}
                    className="apply-form__file-input"
                    type="file"
                    accept={FILE_ACCEPT}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      updateAnswer(
                        field.name,
                        file
                          ? {
                              name: file.name,
                              size: file.size,
                              type: file.type,
                              lastModified: file.lastModified,
                            }
                          : null,
                      );
                    }}
                  />
                </label>
                {fileValue?.name ? <p className="apply-form__file-name">{fileValue.name}</p> : null}
                {fieldErrors[field.name] ? <p className="apply-form__error">{fieldErrors[field.name]}</p> : null}
              </div>
            );
          }

          return (
            <div className="apply-form__group" key={field.id}>
              <label className="apply-form__label" htmlFor={fieldId}>
                {field.label}
                {field.required ? <span className="apply-form__required">*</span> : null}
              </label>
              <input
                id={fieldId}
                className={controlClassName}
                type={INPUT_TYPE_BY_FIELD[field.type] || "text"}
                value={String(answers[field.name] ?? "")}
                onChange={(event) => updateAnswer(field.name, event.target.value)}
                placeholder={field.placeholder || field.label}
                aria-invalid={invalid || undefined}
              />
              {fieldErrors[field.name] ? <p className="apply-form__error">{fieldErrors[field.name]}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="apply-form__actions">
        <button className="btn btn-two apply-form__submit" type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
