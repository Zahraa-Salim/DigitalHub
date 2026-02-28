import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { ApiError, api, apiList } from "../../utils/api";
import "./FormsPage.css";

const FIELD_TYPES = ["text", "textarea", "email", "phone", "select", "checkbox", "date", "file"] as const;
type FieldType = (typeof FIELD_TYPES)[number];

type FormField = {
  id?: number;
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: unknown;
  placeholder?: string | null;
  min_length?: number | null;
  max_length?: number | null;
  sort_order?: number;
};

type FormConfig = {
  id: number | null;
  key: string;
  title: string;
  description: string;
  is_active: boolean;
  fields: FormField[];
};

type FieldDraft = {
  key: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder: string;
  optionsText: string;
  minLength: string;
  maxLength: string;
};

type FieldTemplate = Omit<FieldDraft, "key">;

type CohortOption = {
  id: number;
  name: string;
  program_title: string;
  status: string;
  use_general_form: boolean;
  application_form_id: number | null;
  updated_at: string;
};

type CohortFormResponse = {
  cohort: {
    id: number;
    name: string;
    program_title: string;
    status: string;
    use_general_form: boolean;
    application_form_id: number | null;
  };
  general_form: FormConfig;
  custom_form: FormConfig | null;
  suggested_custom_form: FormConfig;
  resolved_form: FormConfig;
};

type FormsTab = "general" | "cohort";

const RECOMMENDED_FIELD_TEMPLATES: FieldTemplate[] = [
  {
    name: "full_name",
    label: "Full Name",
    type: "text",
    required: true,
    placeholder: "Enter your full name",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "email",
    label: "Email Address",
    type: "email",
    required: true,
    placeholder: "you@example.com",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "phone",
    label: "Phone Number",
    type: "phone",
    required: true,
    placeholder: "+1 555 000 0000",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "date_of_birth",
    label: "Date of Birth",
    type: "date",
    required: true,
    placeholder: "",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "education_level",
    label: "Education",
    type: "select",
    required: true,
    placeholder: "Select your education level",
    optionsText: "High School, Diploma, Bachelor's, Master's, PhD, Other",
    minLength: "",
    maxLength: "",
  },
  {
    name: "city",
    label: "City",
    type: "text",
    required: false,
    placeholder: "Your current city",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "country",
    label: "Country",
    type: "text",
    required: false,
    placeholder: "Your country",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "address",
    label: "Address",
    type: "textarea",
    required: false,
    placeholder: "Street, city, country",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "linkedin_url",
    label: "LinkedIn Profile",
    type: "text",
    required: false,
    placeholder: "https://linkedin.com/in/username",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "github_url",
    label: "GitHub Profile",
    type: "text",
    required: false,
    placeholder: "https://github.com/username",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "portfolio_url",
    label: "Portfolio URL",
    type: "text",
    required: false,
    placeholder: "https://your-portfolio.com",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "motivation",
    label: "Why do you want to join this cohort?",
    type: "textarea",
    required: true,
    placeholder: "Tell us about your goals.",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
  {
    name: "experience_summary",
    label: "Experience Summary",
    type: "textarea",
    required: false,
    placeholder: "Share your relevant experience.",
    optionsText: "",
    minLength: "",
    maxLength: "",
  },
];

function toFieldDraft(field: FormField, index: number): FieldDraft {
  const optionsText = Array.isArray(field.options)
    ? field.options.join(", ")
    : typeof field.options === "string"
      ? field.options
      : field.options
        ? JSON.stringify(field.options)
        : "";

  return {
    key: `${field.name || "field"}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: field.name || "",
    label: field.label || "",
    type: field.type || "text",
    required: Boolean(field.required),
    placeholder: field.placeholder || "",
    optionsText,
    minLength: field.min_length === null || field.min_length === undefined ? "" : String(field.min_length),
    maxLength: field.max_length === null || field.max_length === undefined ? "" : String(field.max_length),
  };
}

function createEmptyFieldDraft(index: number): FieldDraft {
  return {
    key: `new-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    optionsText: "",
    minLength: "",
    maxLength: "",
  };
}

function createDraftKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRecommendedFieldDrafts(): FieldDraft[] {
  return RECOMMENDED_FIELD_TEMPLATES.map((template, index) => ({
    ...template,
    key: `recommended-${index}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

function parseLengthValue(raw: string): number | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Field min/max length must be a whole number greater than or equal to 0.");
  }

  return parsed;
}

function toSafeFieldName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function toFriendlyFormsError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const message = err.message || fallback;
    if (message.toLowerCase().includes("duplicate value violates a unique constraint")) {
      return "Two fields are using the same Name. Each field Name must be unique.";
    }
    return message;
  }

  if (err instanceof Error) {
    const message = err.message || fallback;
    if (message.toLowerCase().includes("duplicate value violates a unique constraint")) {
      return "Two fields are using the same Name. Each field Name must be unique.";
    }
    return message;
  }

  return fallback;
}

function toStatusBadgeTone(status: string):
  | "coming_soon"
  | "open"
  | "running"
  | "completed"
  | "cancelled"
  | "default" {
  const normalized = status.trim().toLowerCase();
  if (normalized === "coming_soon") return "coming_soon";
  if (normalized === "open") return "open";
  if (normalized === "running") return "running";
  if (normalized === "completed") return "completed";
  if (normalized === "cancelled") return "cancelled";
  return "default";
}

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="6" r="1.2" />
      <circle cx="15" cy="6" r="1.2" />
      <circle cx="9" cy="12" r="1.2" />
      <circle cx="15" cy="12" r="1.2" />
      <circle cx="9" cy="18" r="1.2" />
      <circle cx="15" cy="18" r="1.2" />
    </svg>
  );
}

function buildFieldsPayload(drafts: FieldDraft[]): FormField[] {
  if (!drafts.length) {
    throw new Error("At least one field is required.");
  }

  const fields = drafts.map((field, index) => {
    const label = field.label.trim();
    if (!label) {
      throw new Error(`Field ${index + 1} requires a label.`);
    }

    const rawName = field.name.trim();
    const fallbackName = toSafeFieldName(label);
    const name = toSafeFieldName(rawName || fallbackName);
    if (!name) {
      throw new Error(`Field ${index + 1} requires a valid name.`);
    }

    let options: unknown = undefined;
    const optionsText = field.optionsText.trim();

    if (optionsText && (field.type === "select" || field.type === "checkbox")) {
      if ((optionsText.startsWith("[") && optionsText.endsWith("]")) || (optionsText.startsWith("{") && optionsText.endsWith("}"))) {
        try {
          options = JSON.parse(optionsText) as unknown;
        } catch {
          throw new Error(`Field ${index + 1} options must be valid JSON or comma-separated values.`);
        }
      } else {
        options = optionsText
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      }
    }

    return {
      name,
      label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder.trim() || null,
      options,
      min_length: parseLengthValue(field.minLength),
      max_length: parseLengthValue(field.maxLength),
      sort_order: index,
    };
  });

  const seen = new Set<string>();
  for (const field of fields) {
    if (seen.has(field.name)) {
      throw new Error(`Duplicate field name '${field.name}'. Field names must be unique.`);
    }
    seen.add(field.name);
  }

  return fields;
}

function toFormConfig(form: FormConfig): FormConfig {
  return {
    id: form.id ?? null,
    key: form.key,
    title: form.title || "",
    description: form.description || "",
    is_active: form.is_active ?? true,
    fields: form.fields ?? [],
  };
}

export function FormsPage() {
  const [searchParams] = useSearchParams();
  const queryCohortId = searchParams.get("cohort_id");
  const queryMode = searchParams.get("mode");
  const [activeTab, setActiveTab] = useState<FormsTab>(
    queryMode === "custom" || Boolean(queryCohortId) ? "cohort" : "general",
  );

  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [loadingCohortForm, setLoadingCohortForm] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingCohort, setSavingCohort] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [generalForm, setGeneralForm] = useState<FormConfig | null>(null);
  const [generalFieldsDraft, setGeneralFieldsDraft] = useState<FieldDraft[]>([]);
  const [openGeneralFieldKey, setOpenGeneralFieldKey] = useState<string | null>(null);

  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>(queryCohortId || "");
  const [cohortMode, setCohortMode] = useState<"general" | "custom">(queryMode === "custom" ? "custom" : "general");
  const [cohortDetail, setCohortDetail] = useState<CohortFormResponse | null>(null);
  const [customForm, setCustomForm] = useState<FormConfig | null>(null);
  const [customFieldsDraft, setCustomFieldsDraft] = useState<FieldDraft[]>([]);
  const [openCustomFieldKey, setOpenCustomFieldKey] = useState<string | null>(null);
  const [generalMetaDirty, setGeneralMetaDirty] = useState(false);
  const [customMetaDirty, setCustomMetaDirty] = useState(false);
  const generalEditorRef = useRef<HTMLDivElement | null>(null);
  const customEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (queryMode === "custom" || queryCohortId) {
      setActiveTab("cohort");
    }
  }, [queryCohortId, queryMode]);

  useEffect(() => {
    let active = true;

    const loadGeneralForm = async () => {
      setLoadingGeneral(true);
      try {
        const result = await api<FormConfig>("/forms/general");
        if (!active) {
          return;
        }

        const normalized = toFormConfig(result);
        setGeneralForm(normalized);
        setGeneralFieldsDraft(
          normalized.fields.length
            ? normalized.fields.map((field, index) => toFieldDraft(field, index))
            : createRecommendedFieldDrafts(),
        );
        setOpenGeneralFieldKey(null);
        setGeneralMetaDirty(false);
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message || "Failed to load general form.");
        } else {
          setError("Failed to load general form.");
        }
      } finally {
        if (active) {
          setLoadingGeneral(false);
        }
      }
    };

    void loadGeneralForm();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadCohorts = async () => {
      setLoadingCohorts(true);
      try {
        const result = await apiList<CohortOption>("/forms/cohorts/options");
        if (!active) {
          return;
        }

        setCohorts(result.data);
        setError("");

        if (!selectedCohortId && result.data.length) {
          const nextId = queryCohortId || String(result.data[0].id);
          setSelectedCohortId(nextId);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message || "Failed to load cohort options.");
        } else {
          setError("Failed to load cohort options.");
        }
      } finally {
        if (active) {
          setLoadingCohorts(false);
        }
      }
    };

    void loadCohorts();

    return () => {
      active = false;
    };
  }, [queryCohortId, selectedCohortId]);

  useEffect(() => {
    if (!selectedCohortId) {
      setCohortDetail(null);
      setCustomForm(null);
      setCustomFieldsDraft([]);
      setOpenCustomFieldKey(null);
      setCustomMetaDirty(false);
      return;
    }

    let active = true;

    const loadCohortForm = async () => {
      setLoadingCohortForm(true);
      try {
        const result = await api<CohortFormResponse>(`/forms/cohorts/${selectedCohortId}`);
        if (!active) {
          return;
        }

        setCohortDetail(result);
        setCohortMode(queryMode === "custom" ? "custom" : result.cohort.use_general_form ? "general" : "custom");

        const baseCustom = result.custom_form ?? result.suggested_custom_form;
        const normalizedCustom = toFormConfig(baseCustom);
        setCustomForm(normalizedCustom);
        setCustomFieldsDraft(normalizedCustom.fields.map((field, index) => toFieldDraft(field, index)));
        setOpenCustomFieldKey(null);
        setCustomMetaDirty(false);
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message || "Failed to load cohort form.");
        } else {
          setError("Failed to load cohort form.");
        }
      } finally {
        if (active) {
          setLoadingCohortForm(false);
        }
      }
    };

    void loadCohortForm();

    return () => {
      active = false;
    };
  }, [queryMode, selectedCohortId]);

  const selectedCohortOption = useMemo(
    () => cohorts.find((cohort) => String(cohort.id) === selectedCohortId) ?? null,
    [cohorts, selectedCohortId],
  );

  const updateFieldDraft = (
    setDrafts: Dispatch<SetStateAction<FieldDraft[]>>,
    key: string,
    patch: Partial<FieldDraft>,
  ) => {
    setDrafts((current) => current.map((field) => (field.key === key ? { ...field, ...patch } : field)));
  };

  const removeFieldDraft = (
    setDrafts: Dispatch<SetStateAction<FieldDraft[]>>,
    key: string,
  ) => {
    setDrafts((current) => {
      if (current.length <= 1) {
        return current;
      }
      return current.filter((field) => field.key !== key);
    });
  };

  const moveFieldDraft = (
    drafts: FieldDraft[],
    key: string,
    direction: -1 | 1,
  ): FieldDraft[] => {
    const from = drafts.findIndex((field) => field.key === key);
    if (from < 0) {
      return drafts;
    }
    const to = from + direction;
    if (to < 0 || to >= drafts.length) {
      return drafts;
    }
    const clone = [...drafts];
    const [item] = clone.splice(from, 1);
    clone.splice(to, 0, item);
    return clone;
  };

  const applyRecommendedDefaults = () => {
    setError("");
    const nextDrafts = createRecommendedFieldDrafts();
    setGeneralFieldsDraft(nextDrafts);
    setOpenGeneralFieldKey(null);
    void saveGeneralFields(nextDrafts, true);
  };

  const addFieldDraft = (
    setDrafts: Dispatch<SetStateAction<FieldDraft[]>>,
    setOpenFieldKey: Dispatch<SetStateAction<string | null>>,
  ): string => {
    const createdKey = createDraftKey("new");
    setDrafts((current) => [
      ...current,
      {
        ...createEmptyFieldDraft(current.length),
        key: createdKey,
      },
    ]);
    setOpenFieldKey(createdKey);
    return createdKey;
  };

  const renderFieldEditor = (
    title: string,
    drafts: FieldDraft[],
    setDrafts: Dispatch<SetStateAction<FieldDraft[]>>,
    openFieldKey: string | null,
    setOpenFieldKey: Dispatch<SetStateAction<string | null>>,
    saveDrafts: (nextDrafts: FieldDraft[], showSuccess?: boolean) => Promise<boolean>,
    isSaving: boolean,
    editorRef: React.RefObject<HTMLDivElement | null>,
  ) => (
    <div className="form-stack forms-editor" ref={editorRef}>
      <div className="forms-editor__head">
        <p className="section-title">{title}</p>
        <div className="forms-editor__head-actions">
          <p className="info-text info-text--small">
            Tip: if Name is empty, it will be auto-generated from Label.
          </p>
          <button
            className="btn btn--primary btn--sm"
            type="button"
            onClick={() => {
              const createdKey = addFieldDraft(setDrafts, setOpenFieldKey);
              window.setTimeout(() => {
                const element = document.getElementById(`forms-field-${createdKey}`);
                element?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 0);
            }}
          >
            Add Field
          </button>
        </div>
      </div>
      {drafts.map((field, index) => (
        <div
          key={field.key}
          id={`forms-field-${field.key}`}
          className={openFieldKey === field.key ? "forms-field-card forms-field-card--editing" : "forms-field-card"}
        >
          <div className="forms-field-card__header">
            <div className="forms-field-card__left">
              <span className="forms-field-card__grip" aria-hidden="true">
                <GripIcon />
              </span>
              <div className="forms-field-card__summary">
                <div className="forms-field-card__title-row">
                  <p className="forms-field-card__title">{field.label.trim() || `Field #${index + 1}`}</p>
                  {field.required ? <span className="forms-field-card__required">Required</span> : null}
                </div>
                <div className="forms-field-card__meta">
                  <span className="forms-field-card__chip">{field.type.toUpperCase()}</span>
                  <span className="forms-field-card__chip forms-field-card__chip--name">
                    name: {toSafeFieldName(field.name || field.label) || `field_${index + 1}`}
                  </span>
                </div>
              </div>
            </div>
            <div className="forms-field-card__actions">
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={async () => {
                  const nextDrafts = moveFieldDraft(drafts, field.key, -1);
                  setDrafts(nextDrafts);
                  await saveDrafts(nextDrafts, false);
                }}
                disabled={index === 0 || isSaving}
                aria-label={`Move field ${index + 1} up`}
              >
                ↑
              </button>
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={async () => {
                  const nextDrafts = moveFieldDraft(drafts, field.key, 1);
                  setDrafts(nextDrafts);
                  await saveDrafts(nextDrafts, false);
                }}
                disabled={index === drafts.length - 1 || isSaving}
                aria-label={`Move field ${index + 1} down`}
              >
                ↓
              </button>
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={async () => {
                  if (openFieldKey === field.key) {
                    const ok = await saveDrafts(drafts, true);
                    if (ok) {
                      setOpenFieldKey(null);
                    }
                    return;
                  }
                  setOpenFieldKey(field.key);
                }}
                disabled={isSaving}
              >
                {openFieldKey === field.key ? "Save" : "Edit"}
              </button>
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={async () => {
                  const confirmed = window.confirm(`Delete field "${field.label.trim() || `Field #${index + 1}`}"?`);
                  if (!confirmed) {
                    return;
                  }
                  removeFieldDraft(setDrafts, field.key);
                  const nextDrafts = drafts.filter((item) => item.key !== field.key);
                  await saveDrafts(nextDrafts, true);
                  setOpenFieldKey((current) => (current === field.key ? null : current));
                }}
                disabled={isSaving}
              >
                Delete
              </button>
            </div>
          </div>

          {openFieldKey === field.key ? (
            <div className="forms-field-card__edit">
              <div className="forms-editor__field-grid">
                <label className="field">
                  <span className="field__label">Label</span>
                  <input
                    className="field__control"
                    type="text"
                    value={field.label}
                    onChange={(event) => updateFieldDraft(setDrafts, field.key, { label: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Name</span>
                  <input
                    className="field__control"
                    type="text"
                    value={field.name}
                    onChange={(event) => updateFieldDraft(setDrafts, field.key, { name: event.target.value })}
                    placeholder="example: full_name (auto-generated if blank)"
                  />
                </label>
                <label className="field">
                  <span className="field__label">Type</span>
                  <select
                    className="field__control"
                    value={field.type}
                    onChange={(event) => updateFieldDraft(setDrafts, field.key, { type: event.target.value as FieldType })}
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field__label">Placeholder</span>
                  <input
                    className="field__control"
                    type="text"
                    value={field.placeholder}
                    onChange={(event) => updateFieldDraft(setDrafts, field.key, { placeholder: event.target.value })}
                  />
                </label>
                <label className="field forms-editor__compact-field">
                  <span className="field__label">Min Length</span>
                  <input
                    className="field__control"
                    type="number"
                    min={0}
                    step={1}
                    value={field.minLength}
                    onChange={(event) => updateFieldDraft(setDrafts, field.key, { minLength: event.target.value })}
                  />
                </label>
                <label className="field forms-editor__compact-field">
                  <span className="field__label">Max Length</span>
                  <input
                    className="field__control"
                    type="number"
                    min={0}
                    step={1}
                    value={field.maxLength}
                    onChange={(event) => updateFieldDraft(setDrafts, field.key, { maxLength: event.target.value })}
                  />
                </label>
                <label className="field cohort-form-switch forms-editor__switch-field">
                  <span className="field__label">Required</span>
                  <input
                    className="cohort-form-switch__checkbox"
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) => updateFieldDraft(setDrafts, field.key, { required: event.target.checked })}
                  />
                </label>
              </div>
              {field.type === "select" || field.type === "checkbox" ? (
                <label className="field forms-editor__options-field">
                  <span className="field__label">Options</span>
                  <input
                    className="field__control"
                    type="text"
                    value={field.optionsText}
                    onChange={(event) => updateFieldDraft(setDrafts, field.key, { optionsText: event.target.value })}
                    placeholder="Comma-separated or JSON"
                  />
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );

  const saveGeneralForm = async (
    draftOverride?: FieldDraft[],
    formOverride?: FormConfig,
    showSuccess = true,
  ): Promise<boolean> => {
    const formSource = formOverride ?? generalForm;
    const fieldSource = draftOverride ?? generalFieldsDraft;
    if (!formSource) {
      return false;
    }

    setSavingGeneral(true);
    setError("");
    if (showSuccess) {
      setSuccess("");
    }

    try {
      const payload = {
        title: formSource.title.trim() || "General Application Form",
        description: formSource.description.trim() || "Default application form used across cohorts.",
        is_active: formSource.is_active,
        fields: buildFieldsPayload(fieldSource),
      };

      const saved = await api<FormConfig>("/forms/general", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const normalized = toFormConfig(saved);
      setGeneralForm(normalized);
      setGeneralFieldsDraft(normalized.fields.map((field, index) => toFieldDraft(field, index)));
      setGeneralMetaDirty(false);
      if (showSuccess) {
        setSuccess("General form saved.");
      }
      return true;
    } catch (err) {
      setError(toFriendlyFormsError(err, "Failed to save general form."));
      return false;
    } finally {
      setSavingGeneral(false);
    }
  };

  const saveCohortForm = async (
    modeOverride?: "general" | "custom",
    customFormOverride?: FormConfig | null,
    customDraftsOverride?: FieldDraft[],
    showSuccess = true,
  ): Promise<boolean> => {
    if (!selectedCohortId) {
      setError("Please select a cohort first.");
      return false;
    }

    const nextMode = modeOverride ?? cohortMode;
    const nextCustomForm = customFormOverride ?? customForm;
    const nextCustomDrafts = customDraftsOverride ?? customFieldsDraft;

    setSavingCohort(true);
    setError("");
    if (showSuccess) {
      setSuccess("");
    }

    try {
      if (nextMode === "general") {
        await api<CohortFormResponse>(`/forms/cohorts/${selectedCohortId}`, {
          method: "PUT",
          body: JSON.stringify({ mode: "general" }),
        });
      } else {
        const source = nextCustomForm ?? cohortDetail?.suggested_custom_form;
        if (!source) {
          throw new Error("No custom form data available for this cohort.");
        }

        await api<CohortFormResponse>(`/forms/cohorts/${selectedCohortId}`, {
          method: "PUT",
          body: JSON.stringify({
            mode: "custom",
            form: {
              title: source.title.trim() || `${cohortDetail?.cohort.name || "Cohort"} Application Form`,
              description: source.description.trim() || "Custom cohort application form.",
              is_active: source.is_active,
              fields: buildFieldsPayload(nextCustomDrafts),
            },
          }),
        });
      }

      const refreshed = await api<CohortFormResponse>(`/forms/cohorts/${selectedCohortId}`);
      setCohortDetail(refreshed);
      const refreshedCustom = toFormConfig(refreshed.custom_form ?? refreshed.suggested_custom_form);
      setCustomForm(refreshedCustom);
      setCustomFieldsDraft(refreshedCustom.fields.map((field, index) => toFieldDraft(field, index)));
      setCustomMetaDirty(false);
      if (showSuccess) {
        setSuccess("Cohort form saved.");
      }
      return true;
    } catch (err) {
      setError(toFriendlyFormsError(err, "Failed to save cohort form configuration."));
      return false;
    } finally {
      setSavingCohort(false);
    }
  };

  const saveGeneralFields = async (nextDrafts: FieldDraft[], showSuccess = true): Promise<boolean> => {
    const snapshot = generalForm;
    if (!snapshot) {
      return false;
    }
    return saveGeneralForm(nextDrafts, snapshot, showSuccess);
  };

  const saveCustomFields = async (nextDrafts: FieldDraft[], showSuccess = true): Promise<boolean> => {
    const snapshot = customForm;
    if (!snapshot) {
      return false;
    }
    return saveCohortForm("custom", snapshot, nextDrafts, showSuccess);
  };

  useEffect(() => {
    if (!generalMetaDirty || !generalForm || loadingGeneral) {
      return;
    }
    const timer = window.setTimeout(() => {
      void saveGeneralForm(undefined, undefined, false);
      setGeneralMetaDirty(false);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [generalMetaDirty, generalForm, generalFieldsDraft, loadingGeneral]);

  useEffect(() => {
    if (!customMetaDirty || !customForm || loadingCohortForm || cohortMode !== "custom" || !selectedCohortId) {
      return;
    }
    const timer = window.setTimeout(() => {
      void saveCohortForm("custom", undefined, undefined, false);
      setCustomMetaDirty(false);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [customMetaDirty, customForm, customFieldsDraft, loadingCohortForm, cohortMode, selectedCohortId]);

  const resetCustomFromGeneral = () => {
    if (!cohortDetail) {
      return;
    }

    const base = toFormConfig({
      ...cohortDetail.general_form,
      id: null,
      key: `cohort_${cohortDetail.cohort.id}_application_form`,
      title: `${cohortDetail.cohort.name} Application Form`,
      description: `Custom application form for cohort ${cohortDetail.cohort.name}.`,
    });

    setCustomForm(base);
    const nextDrafts = base.fields.map((field, index) => toFieldDraft(field, index));
    setCustomFieldsDraft(nextDrafts);
    setOpenCustomFieldKey(null);
    void saveCohortForm("custom", base, nextDrafts, true);
  };

  return (
    <PageShell title="Application Forms" subtitle="Manage the general application form and customize forms for specific cohorts.">
      <div className="dh-page forms-page forms-page--tabs">
        <div className="forms-tabs" role="tablist" aria-label="Applications form tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "general"}
            className={activeTab === "general" ? "forms-tab forms-tab--active" : "forms-tab"}
            onClick={() => setActiveTab("general")}
          >
            General Form
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "cohort"}
            className={activeTab === "cohort" ? "forms-tab forms-tab--active" : "forms-tab"}
            onClick={() => setActiveTab("cohort")}
          >
            Cohort Override
          </button>
        </div>

        {error ? (
          <Card>
            <p className="alert alert--error">{error}</p>
          </Card>
        ) : null}
        {success ? (
          <Card>
            <p className="alert alert--success">{success}</p>
          </Card>
        ) : null}

        {activeTab === "general" ? (
          <Card className="forms-page__panel">
            <div className="form-stack">
              <div className="forms-page__panel-head">
                <p className="section-title">General Form</p>
                <div className="forms-page__panel-actions">
                  <button
                    className="btn btn--secondary btn--sm"
                    type="button"
                    onClick={applyRecommendedDefaults}
                    disabled={loadingGeneral}
                  >
                    Use Recommended Defaults
                  </button>
                </div>
              </div>

              {loadingGeneral || !generalForm ? (
                <p className="info-text">Loading general form...</p>
              ) : (
                <>
                  <label className="field">
                    <span className="field__label">Title</span>
                    <input
                      className="field__control"
                      type="text"
                      value={generalForm.title}
                      onChange={(event) => {
                        setGeneralForm((current) => (current ? { ...current, title: event.target.value } : current));
                        setGeneralMetaDirty(true);
                      }}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Description</span>
                    <textarea
                      className="textarea-control"
                      value={generalForm.description}
                      onChange={(event) => {
                        setGeneralForm((current) => (current ? { ...current, description: event.target.value } : current));
                        setGeneralMetaDirty(true);
                      }}
                    />
                  </label>
                  <label className="field cohort-form-switch">
                    <span className="field__label">Active</span>
                    <input
                      className="cohort-form-switch__checkbox"
                      type="checkbox"
                      checked={generalForm.is_active}
                      onChange={(event) => {
                        setGeneralForm((current) => (current ? { ...current, is_active: event.target.checked } : current));
                        setGeneralMetaDirty(true);
                      }}
                    />
                  </label>

                  {renderFieldEditor(
                    "General Form Fields",
                    generalFieldsDraft,
                    setGeneralFieldsDraft,
                    openGeneralFieldKey,
                    setOpenGeneralFieldKey,
                    saveGeneralFields,
                    savingGeneral,
                    generalEditorRef,
                  )}
                </>
              )}
            </div>
          </Card>
        ) : (
          <Card className="forms-page__panel">
            <div className="form-stack">
              <div className="forms-page__panel-head">
                <p className="section-title">Cohort Form Override</p>
                {savingCohort ? <span className="info-text info-text--small">Saving...</span> : null}
              </div>

              {loadingCohorts ? (
                <p className="info-text">Loading cohorts...</p>
              ) : (
                <>
                  <label className="field">
                    <span className="field__label">Cohort</span>
                    <select
                      className="field__control"
                      value={selectedCohortId}
                      onChange={(event) => setSelectedCohortId(event.target.value)}
                    >
                      <option value="">Select cohort</option>
                      {cohorts.map((cohort) => (
                        <option key={cohort.id} value={cohort.id}>
                          {cohort.name} - {cohort.program_title}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedCohortOption ? (
                    <div className="post-details forms-page__cohort-summary">
                      <p className="post-details__line">
                        <strong>Program:</strong> {selectedCohortOption.program_title}
                      </p>
                      <p className="post-details__line">
                        <strong>Status:</strong> <Badge tone={toStatusBadgeTone(selectedCohortOption.status)}>{selectedCohortOption.status}</Badge>
                      </p>
                    </div>
                  ) : null}

                  {loadingCohortForm ? <p className="info-text">Loading cohort form...</p> : null}

                  {!loadingCohortForm && selectedCohortId ? (
                    <>
                      <div className="cohort-form-grid">
                        <label className="field cohort-form-switch">
                          <span className="field__label">Use General Form</span>
                          <input
                            className="cohort-form-switch__checkbox"
                            type="radio"
                            checked={cohortMode === "general"}
                            onChange={() => {
                              setCohortMode("general");
                              void saveCohortForm("general", undefined, undefined, true);
                            }}
                          />
                        </label>
                        <label className="field cohort-form-switch">
                          <span className="field__label">Use Custom Form</span>
                          <input
                            className="cohort-form-switch__checkbox"
                            type="radio"
                            checked={cohortMode === "custom"}
                            onChange={() => {
                              setCohortMode("custom");
                              void saveCohortForm("custom", undefined, undefined, true);
                            }}
                          />
                        </label>
                      </div>

                      {cohortMode === "custom" && customForm ? (
                        <>
                          <div className="forms-page__inline-actions">
                            <button className="btn btn--secondary btn--sm" type="button" onClick={resetCustomFromGeneral}>
                              Reset Custom From General
                            </button>
                          </div>
                          <label className="field">
                            <span className="field__label">Custom Form Title</span>
                            <input
                              className="field__control"
                              type="text"
                              value={customForm.title}
                              onChange={(event) => {
                                setCustomForm((current) => (current ? { ...current, title: event.target.value } : current));
                                setCustomMetaDirty(true);
                              }}
                            />
                          </label>
                          <label className="field">
                            <span className="field__label">Custom Form Description</span>
                            <textarea
                              className="textarea-control"
                              value={customForm.description}
                              onChange={(event) => {
                                setCustomForm((current) => (current ? { ...current, description: event.target.value } : current));
                                setCustomMetaDirty(true);
                              }}
                            />
                          </label>
                          <label className="field cohort-form-switch">
                            <span className="field__label">Active</span>
                            <input
                              className="cohort-form-switch__checkbox"
                              type="checkbox"
                              checked={customForm.is_active}
                              onChange={(event) => {
                                setCustomForm((current) => (current ? { ...current, is_active: event.target.checked } : current));
                                setCustomMetaDirty(true);
                              }}
                            />
                          </label>
                          {renderFieldEditor(
                            "Custom Form Fields",
                            customFieldsDraft,
                            setCustomFieldsDraft,
                            openCustomFieldKey,
                            setOpenCustomFieldKey,
                            saveCustomFields,
                            savingCohort,
                            customEditorRef,
                          )}
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              )}
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
