import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { ApiError, api, apiList } from "../../utils/api";

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

function parseOptionsText(value: string): string[] {
  const raw = value.trim();
  if (!raw) {
    return [];
  }

  if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("{") && raw.endsWith("}"))) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed as Record<string, unknown>).map((item) => String(item).trim()).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderFieldPreview(field: FieldDraft, index: number) {
  const label = field.label.trim() || `Field #${index + 1}`;
  const placeholder = field.placeholder.trim() || `Enter ${label.toLowerCase()}`;
  const options = parseOptionsText(field.optionsText);

  if (field.type === "textarea") {
    return <textarea className="textarea-control forms-editor__preview-control" rows={3} placeholder={placeholder} disabled />;
  }

  if (field.type === "select") {
    return (
      <select className="field__control forms-editor__preview-control" disabled>
        <option value="">{placeholder || "Select an option"}</option>
        {options.map((option, optionIndex) => (
          <option key={`${label}-option-${optionIndex}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    if (!options.length) {
      return <p className="info-text info-text--small">Add options to preview checkbox choices.</p>;
    }

    return (
      <div className="forms-editor__preview-checkboxes">
        {options.map((option, optionIndex) => (
          <label key={`${label}-checkbox-${optionIndex}`} className="forms-editor__preview-checkbox-item">
            <input type="checkbox" disabled />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "file") {
    return <input className="field__control forms-editor__preview-control" type="file" disabled />;
  }

  if (field.type === "date") {
    return <input className="field__control forms-editor__preview-control" type="date" disabled />;
  }

  return (
    <input
      className="field__control forms-editor__preview-control"
      type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
      placeholder={placeholder}
      disabled
    />
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

  const applyRecommendedDefaults = () => {
    setError("");
    setSuccess("Recommended default fields loaded. Click Save General Form to apply.");
    setGeneralFieldsDraft(createRecommendedFieldDrafts());
    setOpenGeneralFieldKey(null);
  };

  const addFieldDraft = (
    setDrafts: Dispatch<SetStateAction<FieldDraft[]>>,
    setOpenFieldKey: Dispatch<SetStateAction<string | null>>,
  ) => {
    const createdKey = createDraftKey("new");
    setDrafts((current) => [
      ...current,
      {
        ...createEmptyFieldDraft(current.length),
        key: createdKey,
      },
    ]);
    setOpenFieldKey(createdKey);
  };

  const renderFieldEditor = (
    title: string,
    drafts: FieldDraft[],
    setDrafts: Dispatch<SetStateAction<FieldDraft[]>>,
    openFieldKey: string | null,
    setOpenFieldKey: Dispatch<SetStateAction<string | null>>,
  ) => (
    <div className="form-stack forms-editor">
      <div className="forms-editor__head">
        <p className="section-title">{title}</p>
        <p className="info-text info-text--small">
          Tip: if Name is empty, it will be auto-generated from Label.
        </p>
      </div>
      {drafts.map((field, index) => (
        <Card key={field.key} className="forms-editor__field-card">
          <div className="form-stack forms-editor__field-stack">
            <div className="forms-editor__field-head">
              <div className="forms-editor__field-title-wrap">
                <p className="section-title">Field #{index + 1}</p>
                <div className="forms-editor__field-badges">
                  <Badge tone="default">{field.type}</Badge>
                  {field.required ? <Badge tone="pending">required</Badge> : <Badge tone="draft">optional</Badge>}
                </div>
              </div>
              <div className="forms-editor__field-actions">
                <button
                  className="btn btn--secondary btn--sm"
                  type="button"
                  onClick={() => setOpenFieldKey(field.key)}
                >
                  {openFieldKey === field.key ? "Editing" : "Edit"}
                </button>
                <button
                  className="btn btn--secondary btn--sm"
                  type="button"
                  onClick={() => {
                    removeFieldDraft(setDrafts, field.key);
                    setOpenFieldKey((current) => (current === field.key ? null : current));
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="forms-editor__preview">
              <p className="forms-editor__preview-label">
                {field.label.trim() || "Field label"}
                {field.required ? <span className="forms-editor__preview-required"> *</span> : null}
              </p>
              {renderFieldPreview(field, index)}
            </div>

            {openFieldKey === field.key ? (
              <>
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
              </>
            ) : null}
          </div>
        </Card>
      ))}
      <div className="forms-editor__actions">
        <button
          className="btn btn--secondary"
          type="button"
          onClick={() => addFieldDraft(setDrafts, setOpenFieldKey)}
        >
          Add Field
        </button>
      </div>
    </div>
  );

  const saveGeneralForm = async () => {
    if (!generalForm) {
      return;
    }

    setSavingGeneral(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: generalForm.title.trim() || "General Application Form",
        description: generalForm.description.trim() || "Default application form used across cohorts.",
        is_active: generalForm.is_active,
        fields: buildFieldsPayload(generalFieldsDraft),
      };

      const saved = await api<FormConfig>("/forms/general", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const normalized = toFormConfig(saved);
      setGeneralForm(normalized);
      setGeneralFieldsDraft(normalized.fields.map((field, index) => toFieldDraft(field, index)));
      setOpenGeneralFieldKey(null);
      setSuccess("General form saved successfully.");
    } catch (err) {
      setError(toFriendlyFormsError(err, "Failed to save general form."));
    } finally {
      setSavingGeneral(false);
    }
  };

  const saveCohortForm = async () => {
    if (!selectedCohortId) {
      setError("Please select a cohort first.");
      return;
    }

    setSavingCohort(true);
    setError("");
    setSuccess("");

    try {
      if (cohortMode === "general") {
        await api<CohortFormResponse>(`/forms/cohorts/${selectedCohortId}`, {
          method: "PUT",
          body: JSON.stringify({ mode: "general" }),
        });
      } else {
        const source = customForm ?? cohortDetail?.suggested_custom_form;
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
              fields: buildFieldsPayload(customFieldsDraft),
            },
          }),
        });
      }

      const refreshed = await api<CohortFormResponse>(`/forms/cohorts/${selectedCohortId}`);
      setCohortDetail(refreshed);
      const refreshedCustom = toFormConfig(refreshed.custom_form ?? refreshed.suggested_custom_form);
      setCustomForm(refreshedCustom);
      setCustomFieldsDraft(refreshedCustom.fields.map((field, index) => toFieldDraft(field, index)));
      setOpenCustomFieldKey(null);
      setSuccess("Cohort form configuration saved successfully.");
    } catch (err) {
      setError(toFriendlyFormsError(err, "Failed to save cohort form configuration."));
    } finally {
      setSavingCohort(false);
    }
  };

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
    setCustomFieldsDraft(base.fields.map((field, index) => toFieldDraft(field, index)));
    setOpenCustomFieldKey(null);
    setSuccess("Custom form reset from the current general form.");
  };

  return (
    <PageShell title="Application Forms" subtitle="Manage the general application form and customize forms for specific cohorts.">
      <div className="dh-page forms-page">
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

        <Card className="forms-page__intro">
          <div className="forms-page__intro-grid">
            <div>
              <p className="section-title">How this works</p>
              <p className="info-text">Use one default form for all cohorts, or override with a cohort-specific custom form.</p>
            </div>
            <div className="forms-page__intro-points">
              <p className="info-text info-text--small">Field Names must be unique inside each form.</p>
              <p className="info-text info-text--small">Custom forms can be reset from the general form at any time.</p>
              <p className="info-text info-text--small">Changes apply immediately to new applications.</p>
            </div>
          </div>
        </Card>

        <div className="forms-page__grid">
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
                  <button
                    className="btn btn--primary btn--sm"
                    type="button"
                    onClick={saveGeneralForm}
                    disabled={savingGeneral || loadingGeneral || !generalForm}
                  >
                    {savingGeneral ? "Saving..." : "Save General Form"}
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
                      onChange={(event) => setGeneralForm((current) => (current ? { ...current, title: event.target.value } : current))}
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Description</span>
                    <textarea
                      className="textarea-control"
                      value={generalForm.description}
                      onChange={(event) =>
                        setGeneralForm((current) => (current ? { ...current, description: event.target.value } : current))
                      }
                    />
                  </label>
                  <label className="field cohort-form-switch">
                    <span className="field__label">Active</span>
                    <input
                      className="cohort-form-switch__checkbox"
                      type="checkbox"
                      checked={generalForm.is_active}
                      onChange={(event) =>
                        setGeneralForm((current) => (current ? { ...current, is_active: event.target.checked } : current))
                      }
                    />
                  </label>

                  {renderFieldEditor(
                    "General Form Fields",
                    generalFieldsDraft,
                    setGeneralFieldsDraft,
                    openGeneralFieldKey,
                    setOpenGeneralFieldKey,
                  )}
                </>
              )}
            </div>
          </Card>

          <Card className="forms-page__panel">
            <div className="form-stack">
              <div className="forms-page__panel-head">
                <p className="section-title">Cohort Form Override</p>
                <button className="btn btn--primary btn--sm" type="button" onClick={saveCohortForm} disabled={savingCohort || !selectedCohortId}>
                  {savingCohort ? "Saving..." : "Save Cohort Form"}
                </button>
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
                            onChange={() => setCohortMode("general")}
                          />
                        </label>
                        <label className="field cohort-form-switch">
                          <span className="field__label">Use Custom Form</span>
                          <input
                            className="cohort-form-switch__checkbox"
                            type="radio"
                            checked={cohortMode === "custom"}
                            onChange={() => setCohortMode("custom")}
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
                              onChange={(event) =>
                                setCustomForm((current) => (current ? { ...current, title: event.target.value } : current))
                              }
                            />
                          </label>
                          <label className="field">
                            <span className="field__label">Custom Form Description</span>
                            <textarea
                              className="textarea-control"
                              value={customForm.description}
                              onChange={(event) =>
                                setCustomForm((current) => (current ? { ...current, description: event.target.value } : current))
                              }
                            />
                          </label>
                          <label className="field cohort-form-switch">
                            <span className="field__label">Active</span>
                            <input
                              className="cohort-form-switch__checkbox"
                              type="checkbox"
                              checked={customForm.is_active}
                              onChange={(event) =>
                                setCustomForm((current) => (current ? { ...current, is_active: event.target.checked } : current))
                              }
                            />
                          </label>
                          {renderFieldEditor(
                            "Custom Form Fields",
                            customFieldsDraft,
                            setCustomFieldsDraft,
                            openCustomFieldKey,
                            setOpenCustomFieldKey,
                          )}
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
