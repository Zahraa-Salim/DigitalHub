// File: frontend/src/forms/GeneralApplyForm.tsx
// What this code does:
// 1) Implements form fields, validation, and submission flows.
// 2) Normalizes user input before API requests are sent.
// 3) Handles loading, error, and success feedback states.
// 4) Keeps form behavior consistent across intake workflows.
"use client";

import BtnArrow from "@/svg/BtnArrow";
import { notifyError, notifySuccess } from "@/lib/feedbackToast";
import {
  getPublicApplyForm,
  listPublicCohorts,
  listPublicPrograms,
  submitPublicApply,
  type PublicApplyFormData,
  type PublicCohort,
  type PublicFormField,
  type PublicProgramOption,
} from "@/lib/publicApi";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type GeneralApplyFormProps = {
  defaultProgramId?: number;
  defaultProgramTitle?: string;
};

type AnswersMap = Record<string, unknown>;

type SelectOption = {
  label: string;
  value: string;
};

const inputTypeByField: Record<string, string> = {
  email: "email",
  phone: "tel",
  date: "date",
  file: "file",
  text: "text",
};

const parseSelectOptions = (options: unknown): SelectOption[] => {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      if (typeof option === "string") {
        return { label: option, value: option };
      }

      if (option && typeof option === "object") {
        const source = option as { label?: unknown; value?: unknown };
        const label = typeof source.label === "string" ? source.label : "";
        const value = typeof source.value === "string" ? source.value : "";
        if (label && value) {
          return { label, value };
        }
      }

      return null;
    })
    .filter((option): option is SelectOption => Boolean(option));
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const FALLBACK_GENERAL_FIELDS: PublicFormField[] = [
  {
    id: -1,
    form_id: -1,
    name: "full_name",
    label: "Full Name",
    type: "text",
    required: true,
    options: null,
    placeholder: "Enter your full name",
    min_length: null,
    max_length: null,
    sort_order: 0,
    is_enabled: true,
  },
  {
    id: -2,
    form_id: -1,
    name: "email",
    label: "Email Address",
    type: "email",
    required: true,
    options: null,
    placeholder: "you@example.com",
    min_length: null,
    max_length: null,
    sort_order: 1,
    is_enabled: true,
  },
  {
    id: -3,
    form_id: -1,
    name: "phone",
    label: "Phone Number",
    type: "phone",
    required: true,
    options: null,
    placeholder: "+1 555 000 0000",
    min_length: null,
    max_length: null,
    sort_order: 2,
    is_enabled: true,
  },
  {
    id: -4,
    form_id: -1,
    name: "motivation",
    label: "Why do you want to join?",
    type: "textarea",
    required: true,
    options: null,
    placeholder: "Tell us about your goals.",
    min_length: null,
    max_length: null,
    sort_order: 3,
    is_enabled: true,
  },
];

const buildFallbackApplyFormData = (programs: PublicProgramOption[]): PublicApplyFormData => ({
  form: {
    id: -1,
    key: "general_apply_fallback",
    title: "General Program Application",
    description: "Fallback form loaded because general apply endpoint is temporarily unavailable.",
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  fields: FALLBACK_GENERAL_FIELDS,
  programs,
});

const resolveDefaultProgramId = (
  programs: PublicProgramOption[],
  defaultProgramId?: number,
  defaultProgramTitle?: string
) => {
  const selectedFromId =
    defaultProgramId && programs.some((program) => Number(program.id) === defaultProgramId)
      ? defaultProgramId
      : null;

  const selectedFromTitle =
    !selectedFromId && defaultProgramTitle
      ? programs.find((program) => normalize(program.title) === normalize(defaultProgramTitle))?.id ?? null
      : null;

  return selectedFromId ?? selectedFromTitle ?? null;
};

const buildDefaultAnswers = (fields: PublicFormField[], selectedProgramId: number | null): AnswersMap => {
  const defaults: AnswersMap = {};
  fields.forEach((field) => {
    if (field.type === "checkbox") {
      defaults[field.name] = false;
      return;
    }

    if (field.name === "program_id") {
      defaults[field.name] = selectedProgramId ? String(selectedProgramId) : "";
      return;
    }

    defaults[field.name] = "";
  });
  return defaults;
};

const GeneralApplyForm = ({ defaultProgramId, defaultProgramTitle }: GeneralApplyFormProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [formData, setFormData] = useState<PublicApplyFormData | null>(null);
  const [programCatalog, setProgramCatalog] = useState<PublicProgramOption[]>([]);
  const [cohortCatalog, setCohortCatalog] = useState<PublicCohort[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(defaultProgramId ?? null);
  const [answers, setAnswers] = useState<AnswersMap>({});

  const navigateBackAfterSuccess = () => {
    navigate("/");
  };

  const enabledFields = useMemo(
    () =>
      (formData?.fields || [])
        .filter((field) => field.is_enabled && field.name !== "program_id")
        .sort((a, b) => a.sort_order - b.sort_order),
    [formData]
  );

  const selectedProgramDetails = useMemo(() => {
    if (!selectedProgramId) return null;
    return (
      programCatalog.find((program) => Number(program.id) === selectedProgramId) ||
      formData?.programs.find((program) => Number(program.id) === selectedProgramId) ||
      null
    );
  }, [formData?.programs, programCatalog, selectedProgramId]);

  const selectedProgramCohorts = useMemo(() => {
    if (!selectedProgramId) return [];

    const cohorts = cohortCatalog.filter((cohort) => Number(cohort.program_id) === selectedProgramId);
    return cohorts
      .slice()
      .sort((a, b) => {
        const aDate = a.start_date || a.updated_at || "";
        const bDate = b.start_date || b.updated_at || "";
        return bDate.localeCompare(aDate);
      })
      .slice(0, 6);
  }, [cohortCatalog, selectedProgramId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        let data: PublicApplyFormData;
        let catalog: PublicProgramOption[] = [];
        let cohorts: PublicCohort[] = [];

        try {
          const [applyData, publicPrograms, publicCohorts] = await Promise.all([
            getPublicApplyForm(),
            listPublicPrograms().catch(() => []),
            listPublicCohorts({
              page: 1,
              limit: 300,
              sortBy: "start_date",
              order: "desc",
            }).catch(() => []),
          ]);
          data = applyData;
          catalog = publicPrograms;
          cohorts = publicCohorts;
        } catch (error) {
          const [programs, publicCohorts] = await Promise.all([
            listPublicPrograms(),
            listPublicCohorts({
              page: 1,
              limit: 300,
              sortBy: "start_date",
              order: "desc",
            }).catch(() => []),
          ]);
          if (!programs.length) {
            throw error;
          }

          data = buildFallbackApplyFormData(programs);
          catalog = programs;
          cohorts = publicCohorts;
        }

        if (!active) return;
        setFormData(data);
        setProgramCatalog(catalog.length ? catalog : data.programs);
        setCohortCatalog(cohorts);

        const resolvedProgramId = resolveDefaultProgramId(data.programs, defaultProgramId, defaultProgramTitle);
        setSelectedProgramId(resolvedProgramId);
        setAnswers(buildDefaultAnswers(data.fields || [], resolvedProgramId));
      } catch (error) {
        if (!active) return;
        console.error("Unable to load apply form.", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [defaultProgramId, defaultProgramTitle]);

  const onFieldValueChange = (fieldName: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldName]: value }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);

    try {
      if (!selectedProgramId) {
        throw new Error("Please select a program first.");
      }

      const payloadAnswers: Record<string, unknown> = {
        ...answers,
        program_id: String(selectedProgramId),
      };

      await submitPublicApply({
        program_id: selectedProgramId,
        answers: payloadAnswers,
      });

      notifySuccess("Application submitted successfully.", { id: "general-apply-success" });
      setAnswers(buildDefaultAnswers(formData?.fields || [], selectedProgramId));
      navigateBackAfterSuccess();
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Unable to submit your application right now. Please try again.",
        { id: "general-apply-submit-error" }
      );
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <div className="application-form__skeleton" aria-hidden>
        <div className="application-form__skeleton-line" />
        <div className="application-form__skeleton-line application-form__skeleton-line--lg" />
        <div className="application-form__skeleton-line" />
        <div className="application-form__skeleton-line application-form__skeleton-line--sm" />
      </div>
    );
  }

  if (!formData) {
    return <p>Apply form is temporarily unavailable. Please refresh and try again.</p>;
  }

  return (
    <form onSubmit={onSubmit} id="general-apply-form">
      <div className="form-grp">
        <label htmlFor="general-apply-program-select" className="application-form__field-label">
          <span className="application-form__field-label-text">
            Program <span className="application-form__required-mark" aria-hidden="true">*</span>
          </span>
        </label>
        <select
          id="general-apply-program-select"
          name="program_id"
          required
          className="application-form__select"
          disabled={pending}
          value={selectedProgramId ?? ""}
          onChange={(e) => {
            const nextProgramId = e.target.value ? Number(e.target.value) : null;
            setSelectedProgramId(nextProgramId);
            onFieldValueChange("program_id", nextProgramId ? String(nextProgramId) : "");
          }}
        >
          <option value="" disabled>
            Select program
          </option>
          {formData.programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.title}
            </option>
          ))}
        </select>
      </div>

      <div className={`application-form__program-drawer ${selectedProgramDetails ? "is-open" : ""}`}>
        {selectedProgramDetails ? (
          <div className="application-form__program-drawer-inner">
            <h6>{selectedProgramDetails.title}</h6>
            <p>
              {selectedProgramDetails.summary ||
                selectedProgramDetails.description ||
                "Program details will appear here when available."}
            </p>
            <ul className="list-wrap">
              {selectedProgramDetails.requirements ? (
                <li>
                  <strong>Requirements:</strong> {selectedProgramDetails.requirements}
                </li>
              ) : null}
            </ul>
            {selectedProgramCohorts.length ? (
              <div className="application-form__program-cohorts">
                <strong>Program Cohorts</strong>
                <ul>
                  {selectedProgramCohorts.map((cohort) => (
                    <li key={cohort.id}>
                      <span>{cohort.name}</span>
                      <em className={`is-${cohort.status}`}>{cohort.status.replace("_", " ")}</em>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {enabledFields.map((field) => {
        const fieldId = `general-apply-field-${field.id}`;
        const fieldLabel = field.label || field.name;

        if (field.type === "textarea") {
          return (
            <div className="form-grp" key={field.id}>
              <label htmlFor={fieldId} className="application-form__field-label">
                <span className="application-form__field-label-text">
                  {fieldLabel}
                  {field.required ? <span className="application-form__required-mark" aria-hidden="true">*</span> : null}
                </span>
              </label>
              <textarea
                id={fieldId}
                name={field.name}
                placeholder={field.placeholder || field.label}
                required={field.required}
                aria-required={field.required || undefined}
                value={String(answers[field.name] ?? "")}
                onChange={(e) => onFieldValueChange(field.name, e.target.value)}
              ></textarea>
            </div>
          );
        }

        if (field.type === "select") {
          const options = parseSelectOptions(field.options);
          return (
            <div className="form-grp" key={field.id}>
              <label htmlFor={fieldId} className="application-form__field-label">
                <span className="application-form__field-label-text">
                  {fieldLabel}
                  {field.required ? <span className="application-form__required-mark" aria-hidden="true">*</span> : null}
                </span>
              </label>
              <select
                id={fieldId}
                name={field.name}
                className="application-form__select"
                required={field.required}
                aria-required={field.required || undefined}
                value={String(answers[field.name] ?? "")}
                onChange={(e) => onFieldValueChange(field.name, e.target.value)}
              >
                <option value="" disabled>
                  {field.placeholder || `Select ${field.label}`}
                </option>
                {options.map((option) => (
                  <option key={`${field.id}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === "file") {
          return (
            <div className="form-grp" key={field.id}>
              <label htmlFor={fieldId} className="application-form__field-label">
                <span className="application-form__field-label-text">
                  {fieldLabel}
                  {field.required ? <span className="application-form__required-mark" aria-hidden="true">*</span> : null}
                </span>
              </label>
              <input
                id={fieldId}
                name={field.name}
                type="file"
                required={field.required}
                aria-required={field.required || undefined}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  onFieldValueChange(field.name, file?.name || "");
                }}
              />
            </div>
          );
        }

        if (field.type === "checkbox") {
          return (
            <div className="form-grp" key={field.id}>
              <label className="people-filter-check application-form__check-label" htmlFor={fieldId}>
                <input
                  id={fieldId}
                  name={field.name}
                  type="checkbox"
                  required={field.required}
                  aria-required={field.required || undefined}
                  checked={Boolean(answers[field.name])}
                  onChange={(e) => onFieldValueChange(field.name, e.target.checked)}
                />
                <span className="application-form__field-label-text">
                  {fieldLabel}
                  {field.required ? <span className="application-form__required-mark" aria-hidden="true">*</span> : null}
                </span>
              </label>
            </div>
          );
        }

        return (
          <div className="form-grp" key={field.id}>
            <label htmlFor={fieldId} className="application-form__field-label">
              <span className="application-form__field-label-text">
                {fieldLabel}
                {field.required ? <span className="application-form__required-mark" aria-hidden="true">*</span> : null}
              </span>
            </label>
            <input
              id={fieldId}
              name={field.name}
              type={inputTypeByField[field.type] || "text"}
              placeholder={field.placeholder || field.label}
              required={field.required}
              aria-required={field.required || undefined}
              value={String(answers[field.name] ?? "")}
              onChange={(e) => onFieldValueChange(field.name, e.target.value)}
            />
          </div>
        );
      })}

      <button type="submit" className="btn btn-two arrow-btn" disabled={pending || !selectedProgramId}>
        {pending ? "Submitting..." : "Submit Application"} <BtnArrow />
      </button>
    </form>
  );
};

export default GeneralApplyForm;
