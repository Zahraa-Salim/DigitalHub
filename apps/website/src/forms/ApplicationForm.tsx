"use client";

import BtnArrow from "@/svg/BtnArrow";
import { notifyError, notifySuccess } from "@/lib/feedbackToast";
import {
  API_BASE_URL,
  getPublicCohortFormResolution,
  listPublicCohorts,
  type PublicCohort,
  type PublicFormField,
  type PublicResolvedForm,
} from "@/lib/publicApi";
import React, { useEffect, useMemo, useRef, useState } from "react";

type ApplicationFormProps = {
  defaultCohortId?: number;
};

type ApplicationFormState = {
  success: boolean;
  error: string | null;
};

type AnswersMap = Record<string, unknown>;
type FieldErrors = Record<string, string>;

type SelectOption = {
  label: string;
  value: string;
};

const parseSelectOptions = (options: unknown): SelectOption[] => {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      if (typeof option === "string") {
        return { label: option, value: option };
      }

      if (option && typeof option === "object") {
        const maybeLabel = "label" in option ? String((option as { label?: unknown }).label ?? "") : "";
        const maybeValue = "value" in option ? String((option as { value?: unknown }).value ?? "") : "";
        if (maybeLabel && maybeValue) {
          return { label: maybeLabel, value: maybeValue };
        }
      }

      return null;
    })
    .filter((option): option is SelectOption => Boolean(option));
};

const pickStringValue = (answers: AnswersMap, keys: string[]) => {
  for (const key of keys) {
    const value = answers[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const buildDefaultAnswers = (fields: PublicFormField[], cohort: PublicCohort | null): AnswersMap => {
  const defaults: AnswersMap = {};

  fields.forEach((field) => {
    if (field.type === "checkbox") {
      defaults[field.name] = false;
      return;
    }

    if (field.name === "program_id" && cohort?.program_id) {
      defaults[field.name] = String(cohort.program_id);
      return;
    }

    defaults[field.name] = "";
  });

  return defaults;
};

const toNumberOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const normalizeResolvedCohort = (raw: unknown): PublicCohort | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const id = toNumberOrNull(source.id);
  const programId = toNumberOrNull(source.program_id);
  if (!id || !programId) {
    return null;
  }

  const statusRaw = String(source.status || "").toLowerCase();
  const status: PublicCohort["status"] =
    statusRaw === "coming_soon" ||
    statusRaw === "open" ||
    statusRaw === "running" ||
    statusRaw === "completed" ||
    statusRaw === "cancelled" ||
    statusRaw === "planned"
      ? (statusRaw as PublicCohort["status"])
      : "coming_soon";

  return {
    id,
    program_id: programId,
    program_title: String(source.program_title || ""),
    name: String(source.name || ""),
    status,
    allow_applications: status === "open",
    use_general_form: Boolean(source.use_general_form),
    application_form_id: toNumberOrNull(source.application_form_id),
    updated_at: typeof source.updated_at === "string" ? source.updated_at : undefined,
  };
};

const inputTypeByField: Record<string, string> = {
  email: "email",
  phone: "tel",
  date: "date",
  file: "file",
  text: "text",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const answerAsString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const validateFieldAnswer = (field: PublicFormField, value: unknown): string | null => {
  if (field.type === "checkbox") {
    if (field.required && !Boolean(value)) {
      return `${field.label || field.name} is required.`;
    }
    return null;
  }

  const textValue = answerAsString(value);
  if (field.required && !textValue) {
    return `${field.label || field.name} is required.`;
  }
  if (!textValue) {
    return null;
  }

  if (field.min_length && textValue.length < field.min_length) {
    return `${field.label || field.name} must be at least ${field.min_length} characters.`;
  }
  if (field.max_length && textValue.length > field.max_length) {
    return `${field.label || field.name} must be at most ${field.max_length} characters.`;
  }
  if ((field.type === "email" || field.name.toLowerCase().includes("email")) && !EMAIL_PATTERN.test(textValue)) {
    return "Please enter a valid email address.";
  }
  return null;
};

const ApplicationForm = ({ defaultCohortId }: ApplicationFormProps) => {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ApplicationFormState>({
    success: false,
    error: null,
  });

  const [cohorts, setCohorts] = useState<PublicCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(defaultCohortId ?? null);
  const [selectedCohort, setSelectedCohort] = useState<PublicCohort | null>(null);
  const [resolvedForm, setResolvedForm] = useState<PublicResolvedForm | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [verifyingSelection, setVerifyingSelection] = useState(false);
  const [cohortsLoadError, setCohortsLoadError] = useState<string | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const selectedCohortIdRef = useRef<number | null>(selectedCohortId);
  const selectedCohortRef = useRef<PublicCohort | null>(selectedCohort);
  const pendingRef = useRef(false);
  const resolvedFormRef = useRef<PublicResolvedForm | null>(null);
  const hasLoadedCohortsRef = useRef(false);
  const invalidSelectionStrikesRef = useRef(0);
  const isRevalidatingSelectionRef = useRef(false);
  const cohortValidationRetryTimerRef = useRef<number | null>(null);
  const cohortsSnapshotRef = useRef<string | null>(null);
  const cohortSnapshotRef = useRef<string | null>(null);
  const cohortFormConfigSnapshotRef = useRef<string | null>(null);
  const formSnapshotRef = useRef<string | null>(null);

  const openCohorts = useMemo(
    () => cohorts.filter((cohort) => cohort.status === "open" && cohort.allow_applications),
    [cohorts]
  );

  useEffect(() => {
    selectedCohortIdRef.current = selectedCohortId;
  }, [selectedCohortId]);

  useEffect(() => {
    selectedCohortRef.current = selectedCohort;
  }, [selectedCohort]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    resolvedFormRef.current = resolvedForm;
  }, [resolvedForm]);

  useEffect(() => {
    if (state.success) {
      notifySuccess("Application submitted successfully.", { id: "application-submit-success" });
    }
    if (state.error) {
      notifyError(state.error, { id: "application-submit-error" });
    }
  }, [state]);

  useEffect(() => {
    let active = true;
    const loadCohorts = async () => {
      if (pendingRef.current) return;
      if (!hasLoadedCohortsRef.current) {
        setLoadingCohorts(true);
      }

      try {
        const rows = await listPublicCohorts({
          page: 1,
          limit: 200,
          sortBy: "start_date",
          order: "asc",
        });
        if (!active) return;

        const cohortsSnapshot = JSON.stringify(
          rows.map((cohort) => ({
            id: cohort.id,
            status: cohort.status,
            allow_applications: cohort.allow_applications,
            application_form_id: cohort.application_form_id ?? null,
            use_general_form: cohort.use_general_form ?? true,
            enrollment_close_at: cohort.enrollment_close_at ?? null,
            updated_at: cohort.updated_at ?? null,
          }))
        );
        const cohortsChanged = cohortsSnapshotRef.current !== cohortsSnapshot;
        if (cohortsChanged) {
          cohortsSnapshotRef.current = cohortsSnapshot;
          setCohorts(rows);
        }
        setCohortsLoadError(null);
        hasLoadedCohortsRef.current = true;

        const openRows = rows.filter((cohort) => cohort.status === "open" && cohort.allow_applications);
        const currentSelectedId = selectedCohortIdRef.current;
        const currentSelected = currentSelectedId
          ? rows.find((cohort) => Number(cohort.id) === currentSelectedId) ||
            (selectedCohortRef.current && Number(selectedCohortRef.current.id) === currentSelectedId
              ? selectedCohortRef.current
              : null)
          : null;

        if (currentSelectedId && (!currentSelected || currentSelected.status !== "open" || !currentSelected.allow_applications)) {
          invalidSelectionStrikesRef.current += 1;

          // Avoid false negatives when the first response is temporarily incomplete/stale.
          if (invalidSelectionStrikesRef.current < 2) {
            setState({ success: false, error: null });
            if (cohortValidationRetryTimerRef.current) {
              window.clearTimeout(cohortValidationRetryTimerRef.current);
            }
            cohortValidationRetryTimerRef.current = window.setTimeout(() => {
              if (active && !pendingRef.current) {
                void loadCohorts();
              }
            }, 900);
            return;
          }

          if (isRevalidatingSelectionRef.current) {
            return;
          }

          isRevalidatingSelectionRef.current = true;
          setVerifyingSelection(true);

          try {
            // Final verification before invalidating URL-provided cohort.
            const resolution = await getPublicCohortFormResolution(currentSelectedId);
            if (!active) return;

            const normalized = normalizeResolvedCohort(resolution?.cohort);
            if (normalized && normalized.status === "open") {
              const withOpen = { ...normalized, allow_applications: true };

              const nextRows = rows.some((item) => Number(item.id) === withOpen.id)
                ? rows.map((item) => (Number(item.id) === withOpen.id ? { ...item, ...withOpen } : item))
                : [...rows, withOpen];

              setCohorts(nextRows);
              setSelectedCohort(withOpen);
              setState({ success: false, error: null });
              invalidSelectionStrikesRef.current = 0;
              return;
            }
          } catch {
            // Fall through to invalidation path below.
          } finally {
            isRevalidatingSelectionRef.current = false;
            if (active) {
              setVerifyingSelection(false);
            }
          }

          invalidSelectionStrikesRef.current = 0;
          setSelectedCohortId(null);
          setResolvedForm(null);
          setAnswers({});
          setLiveNotice("Cohort availability changed. Please select another open cohort before submitting.");
          setState({
            success: false,
            error: "Selected cohort is no longer open. Please choose another cohort.",
          });
          return;
        }

        invalidSelectionStrikesRef.current = 0;

        if (!currentSelectedId && defaultCohortId && openRows.some((cohort) => Number(cohort.id) === defaultCohortId)) {
          setSelectedCohortId(defaultCohortId);
        } else if (!currentSelectedId && openRows.length === 1) {
          setSelectedCohortId(openRows[0].id);
        }
      } catch {
        if (!active) return;
        setCohortsLoadError("Unable to verify cohort availability right now. Please try again.");
        setLiveNotice("We couldn't refresh cohort availability right now. Please recheck before submitting.");
      } finally {
        if (active) {
          setLoadingCohorts(false);
        }
      }
    };

    void loadCohorts();

    const intervalId = window.setInterval(() => {
      if (document.hidden || pendingRef.current) return;
      void loadCohorts();
    }, 30000);

    const onFocus = () => {
      if (pendingRef.current) return;
      void loadCohorts();
    };

    const onVisibility = () => {
      if (!document.hidden && !pendingRef.current) {
        void loadCohorts();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      if (cohortValidationRetryTimerRef.current) {
        window.clearTimeout(cohortValidationRetryTimerRef.current);
      }
      isRevalidatingSelectionRef.current = false;
    };
  }, [defaultCohortId]);

  useEffect(() => {
    if (!selectedCohortId) {
      setSelectedCohort(null);
      setResolvedForm(null);
      setAnswers({});
      cohortSnapshotRef.current = null;
      cohortFormConfigSnapshotRef.current = null;
      formSnapshotRef.current = null;
      return;
    }

    const cohortFromList = cohorts.find((row) => Number(row.id) === selectedCohortId) || null;
    const fallbackSelected =
      selectedCohortRef.current && Number(selectedCohortRef.current.id) === selectedCohortId
        ? selectedCohortRef.current
        : null;
    const cohort = cohortFromList || fallbackSelected;
    if (cohort) {
      setSelectedCohort(cohort);
    }

    if (cohort && (cohort.status !== "open" || !cohort.allow_applications)) {
      setResolvedForm(null);
      setAnswers({});
      cohortFormConfigSnapshotRef.current = null;
      formSnapshotRef.current = null;
      setState({
        success: false,
        error: "This cohort is no longer open for enrollment.",
      });
      return;
    }

    const cohortSnapshot = cohort
      ? JSON.stringify({
          id: cohort.id,
          status: cohort.status,
          allow_applications: cohort.allow_applications,
          enrollment_close_at: cohort.enrollment_close_at ?? null,
          application_form_id: cohort.application_form_id ?? null,
          use_general_form: cohort.use_general_form ?? true,
        })
      : null;
    
    // Only notify if we had a previous snapshot and it actually changed (not on initial load)
    if (cohortSnapshotRef.current && cohortFormConfigSnapshotRef.current && cohortSnapshot && cohortSnapshotRef.current !== cohortSnapshot) {
      setLiveNotice("Cohort details changed while you were filling this form. Please review before submitting.");
    }
    if (cohortSnapshot) {
      cohortSnapshotRef.current = cohortSnapshot;
    }

    const cohortFormConfigSnapshot = JSON.stringify({
      id: selectedCohortId,
      status: cohort?.status ?? "open",
      allow_applications: cohort?.allow_applications ?? true,
      application_form_id: cohort?.application_form_id ?? null,
      use_general_form: cohort?.use_general_form ?? true,
    });

    if (
      cohortFormConfigSnapshotRef.current === cohortFormConfigSnapshot &&
      resolvedFormRef.current
    ) {
      return;
    }

    let active = true;
    const loadForm = async () => {
      setLoadingForm(!resolvedFormRef.current);
      try {
        const resolution = await getPublicCohortFormResolution(selectedCohortId);
        if (!active) return;

        const formSnapshot = JSON.stringify({
          id: resolution.resolved_form.id,
          updated_at: resolution.resolved_form.updated_at,
          fields: resolution.resolved_form.fields.map((field) => ({
            id: field.id,
            name: field.name,
            required: field.required,
            type: field.type,
            is_enabled: field.is_enabled,
            sort_order: field.sort_order,
          })),
        });
        const formChanged = Boolean(formSnapshotRef.current && formSnapshotRef.current !== formSnapshot);

        const normalizedResolvedCohort = normalizeResolvedCohort(resolution?.cohort);
        if (normalizedResolvedCohort) {
          setSelectedCohort(normalizedResolvedCohort);
          setCohorts((prev) =>
            prev.some((item) => Number(item.id) === normalizedResolvedCohort.id)
              ? prev.map((item) => (Number(item.id) === normalizedResolvedCohort.id ? { ...item, ...normalizedResolvedCohort } : item))
              : [...prev, normalizedResolvedCohort]
          );
        }

        setResolvedForm(resolution.resolved_form);
        if (!formSnapshotRef.current || formChanged) {
          setAnswers(buildDefaultAnswers(resolution.resolved_form.fields, normalizedResolvedCohort || cohort || null));
        }
        if (formChanged) {
          setLiveNotice("Application fields changed while you were filling this form. Please review before submitting.");
        }
        formSnapshotRef.current = formSnapshot;
        cohortFormConfigSnapshotRef.current = cohortFormConfigSnapshot;
        setState({ success: false, error: null });
      } catch {
        if (!active) return;
        setResolvedForm(null);
        setAnswers({});
        cohortFormConfigSnapshotRef.current = null;
        formSnapshotRef.current = null;
        setState({
          success: false,
          error: "Unable to load application form for this cohort.",
        });
      } finally {
        if (active) setLoadingForm(false);
      }
    };

    loadForm();

    return () => {
      active = false;
    };
  }, [selectedCohortId, cohorts, loadingCohorts, cohortsLoadError]);

  const sortedFields = useMemo(
    () =>
      (resolvedForm?.fields || [])
        .filter((field) => field.is_enabled)
        .sort((a, b) => a.sort_order - b.sort_order),
    [resolvedForm]
  );
  const showFormSkeleton =
    verifyingSelection ||
    (!resolvedForm && loadingCohorts) ||
    (!resolvedForm && Boolean(selectedCohortId && loadingForm));

  const onFieldValueChange = (fieldName: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldName]: value }));
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate current dynamic cohort form fields before submission.
    const nextErrors: FieldErrors = {};
    if (!selectedCohortId) {
      nextErrors.cohort_id = "Please select a cohort first.";
    }
    sortedFields.forEach((field) => {
      const error = validateFieldAnswer(field, answers[field.name]);
      if (error) {
        nextErrors[field.name] = error;
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setState({ success: false, error: "Please fix the highlighted fields and submit again." });
      return;
    }

    setFieldErrors({});
    pendingRef.current = true;
    setPending(true);
    setState({ success: false, error: null });

    try {
      if (!selectedCohortId) {
        throw new Error("Please select a cohort first.");
      }

      if (!resolvedForm) {
        throw new Error("Application form is not ready yet. Please try again.");
      }

      const fullName = pickStringValue(answers, ["full_name", "name"]);
      const email = pickStringValue(answers, ["email", "applicant_email"]);
      const phone = pickStringValue(answers, ["phone", "applicant_phone"]);

      if (!email && !phone) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "Provide at least an email or a phone number.",
          phone: "Provide at least an email or a phone number.",
        }));
        throw new Error("Provide at least an email or a phone number.");
      }

      const payload = {
        cohort_id: selectedCohortId,
        applicant: {
          full_name: fullName || undefined,
          email: email || undefined,
          phone: phone || undefined,
        },
        form_id: resolvedForm.id,
        answers,
      };

      const res = await fetch(`${API_BASE_URL}/applications`, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = "Unable to submit your application right now. Please try again.";
        try {
          const json = (await res.json()) as { error?: { message?: string } };
          if (json?.error?.message) message = json.error.message;
        } catch {
          // Keep fallback error.
        }
        throw new Error(message);
      }

      setState({ success: true, error: null });
      setLiveNotice(null);
      setAnswers(buildDefaultAnswers(sortedFields, selectedCohort));
      setFieldErrors({});
    } catch (error) {
      setState({
        success: false,
        error: error instanceof Error ? error.message : "Unable to submit your application right now. Please try again.",
      });
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} id="application-form" noValidate aria-busy={pending}>
      {liveNotice ? <p className="dh-live-note">{liveNotice}</p> : null}
      <p className="application-form__legend">
        <span className="application-form__required-mark">*</span> Required fields
      </p>
      {state.success ? (
        <p className="application-form__status application-form__status--success" role="status">
          Application submitted successfully. We will contact you soon.
        </p>
      ) : null}
      {state.error ? (
        <p className="application-form__status application-form__status--error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="form-grp">
        <label htmlFor="application-cohort-select" className="application-form__field-label">
          <span className="application-form__field-label-text">
            Cohort <span className="application-form__required-mark" aria-hidden="true">*</span>
          </span>
        </label>
        <select
          id="application-cohort-select"
          name="cohort_id"
          required
          className="application-form__select"
          disabled={loadingCohorts || verifyingSelection || pending}
          value={selectedCohortId ?? ""}
          onChange={(e) => {
            setSelectedCohortId(e.target.value ? Number(e.target.value) : null);
            setFieldErrors((prev) => {
              if (!prev.cohort_id) return prev;
              const next = { ...prev };
              delete next.cohort_id;
              return next;
            });
            setState({ success: false, error: null });
          }}
        >
          <option value="" disabled>
            {loadingCohorts ? "Loading cohorts..." : verifyingSelection ? "Verifying selected cohort..." : "Select open cohort"}
          </option>
          {openCohorts.map((cohort) => (
            <option key={cohort.id} value={cohort.id}>
              {cohort.program_title} - {cohort.name}
            </option>
          ))}
        </select>
        {fieldErrors.cohort_id ? <p className="application-form__field-error">{fieldErrors.cohort_id}</p> : null}
      </div>

      {selectedCohort && (
        <div className="application-form__course-info">
          <h6>{selectedCohort.program_title}</h6>
          <p>{selectedCohort.name}</p>
          <ul className="list-wrap">
            <li>
              <strong>Status:</strong> {selectedCohort.status}
            </li>
            <li>
              <strong>Enrollment:</strong>{" "}
              {selectedCohort.enrollment_close_at
                ? `Closes ${new Date(selectedCohort.enrollment_close_at).toLocaleDateString()}`
                : "Open"}
            </li>
          </ul>
        </div>
      )}

      {showFormSkeleton && (
        <div className="application-form__skeleton" aria-hidden>
          <div className="application-form__skeleton-line application-form__skeleton-line--lg" />
          <div className="application-form__skeleton-line" />
          <div className="application-form__skeleton-line" />
          <div className="application-form__skeleton-line application-form__skeleton-line--sm" />
        </div>
      )}

      {!showFormSkeleton &&
        sortedFields.map((field) => {
          const fieldId = `application-field-${field.id}`;
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
                {fieldErrors[field.name] ? <p className="application-form__field-error">{fieldErrors[field.name]}</p> : null}
              </div>
            );
          }

          if (field.type === "select") {
            const options = parseSelectOptions(field.options);
            const finalOptions =
              options.length > 0
                ? options
                : field.name === "program_id" && selectedCohort
                  ? [{ label: selectedCohort.program_title, value: String(selectedCohort.program_id) }]
                  : [];
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
                  {finalOptions.map((option) => (
                    <option key={`${field.id}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.name] ? <p className="application-form__field-error">{fieldErrors[field.name]}</p> : null}
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
                {fieldErrors[field.name] ? <p className="application-form__field-error">{fieldErrors[field.name]}</p> : null}
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
                {fieldErrors[field.name] ? <p className="application-form__field-error">{fieldErrors[field.name]}</p> : null}
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
              {fieldErrors[field.name] ? <p className="application-form__field-error">{fieldErrors[field.name]}</p> : null}
            </div>
          );
        })}

      <button
        type="submit"
        className="btn btn-two arrow-btn"
        disabled={
          pending ||
          ((!resolvedForm || !selectedCohort) && (loadingCohorts || verifyingSelection)) ||
          loadingForm ||
          !selectedCohortId ||
          !resolvedForm ||
          !selectedCohort ||
          selectedCohort.status !== "open" ||
          !selectedCohort.allow_applications
        }
      >
        {pending ? "Submitting..." : "Submit Application"} <BtnArrow />
      </button>
    </form>
  );
};

export default ApplicationForm;
