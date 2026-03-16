"use client";

import { useEffect, useMemo, useState } from "react";
import DynamicApplicationForm from "@/components/DynamicApplicationForm";
import { notifyError, notifySuccess } from "@/lib/feedbackToast";
import {
  getPublicCohortFormResolution,
  listPublicCohorts,
  submitPublicCohortApply,
  type PublicCohort,
  type PublicCohortFormResolution,
} from "@/lib/publicApi";

type ApplicationFormProps = {
  defaultCohortId?: number;
};

export default function ApplicationForm({ defaultCohortId }: ApplicationFormProps) {
  const [cohorts, setCohorts] = useState<PublicCohort[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [cohortsError, setCohortsError] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(defaultCohortId ?? null);
  const [formResolution, setFormResolution] = useState<PublicCohortFormResolution | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const openCohorts = useMemo(
    () => cohorts.filter((cohort) => cohort.status === "open" && cohort.allow_applications),
    [cohorts],
  );

  const selectedCohort = useMemo(
    () => openCohorts.find((cohort) => Number(cohort.id) === selectedCohortId) ?? null,
    [openCohorts, selectedCohortId],
  );
  const initialAnswers = useMemo(
    () => (selectedCohort ? { program_id: String(selectedCohort.program_id) } : undefined),
    [selectedCohort],
  );

  useEffect(() => {
    let active = true;

    const loadCohorts = async () => {
      setLoadingCohorts(true);
      setCohortsError("");
      try {
        const rows = await listPublicCohorts({
          page: 1,
          limit: 200,
          sortBy: "start_date",
          order: "asc",
        });
        if (!active) return;
        setCohorts(rows);
        const nextOpen = rows.filter((cohort) => cohort.status === "open" && cohort.allow_applications);
        setSelectedCohortId((current) => {
          if (current && nextOpen.some((cohort) => Number(cohort.id) === Number(current))) {
            return current;
          }
          if (defaultCohortId && nextOpen.some((cohort) => Number(cohort.id) === defaultCohortId)) {
            return defaultCohortId;
          }
          return nextOpen.length === 1 ? Number(nextOpen[0].id) : null;
        });
      } catch (error) {
        if (!active) return;
        setCohorts([]);
        setCohortsError(
          error instanceof Error ? error.message : "Unable to load cohorts right now.",
        );
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
  }, [defaultCohortId]);

  useEffect(() => {
    if (!selectedCohortId) {
      setFormResolution(null);
      setFormError("");
      setSubmitError("");
      setSubmitted(false);
      return;
    }

    let active = true;

    const loadForm = async () => {
      setLoadingForm(true);
      setFormError("");
      try {
        const data = await getPublicCohortFormResolution(selectedCohortId);
        if (!active) return;
        setFormResolution(data);
      } catch (error) {
        if (!active) return;
        setFormResolution(null);
        setFormError(
          error instanceof Error ? error.message : "Unable to load this cohort form right now.",
        );
      } finally {
        if (active) {
          setLoadingForm(false);
        }
      }
    };

    void loadForm();
    return () => {
      active = false;
    };
  }, [selectedCohortId]);

  const handleSubmit = async (answers: Record<string, unknown>) => {
    if (!selectedCohort) {
      throw new Error("Select a cohort first.");
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await submitPublicCohortApply(Number(selectedCohort.id), { answers });
      setSubmitted(true);
      notifySuccess("Application submitted successfully.", { id: "public-cohort-apply-success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit your application right now.";
      setSubmitError(message);
      notifyError(message, { id: "public-cohort-apply-error" });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCohorts) {
    return <div className="apply-shell__loading">Loading cohorts...</div>;
  }

  if (cohortsError) {
    return <p className="apply-form__status apply-form__status--error">{cohortsError}</p>;
  }

  if (!openCohorts.length) {
    return <p className="apply-shell__empty">No open cohorts are available right now.</p>;
  }

  if (!selectedCohort) {
    return (
      <div className="prog-select">
        <div className="prog-select__head">
          <h5>Choose a Cohort</h5>
          <p>Select the cohort you want to apply to.</p>
        </div>
        <div className="prog-select__grid">
          {openCohorts.map((cohort) => (
            <button
              key={cohort.id}
              className="prog-select__card"
              type="button"
              onClick={() => setSelectedCohortId(Number(cohort.id))}
            >
              <div className="prog-select__media">
                {cohort.program_image_url ? (
                  <img src={cohort.program_image_url} alt={cohort.program_title} />
                ) : (
                  <div className="prog-select__media-fallback">{cohort.program_title.slice(0, 1)}</div>
                )}
              </div>
              <div className="prog-select__body">
                <p className="prog-select__meta">{cohort.program_title}</p>
                <h6>{cohort.name}</h6>
                <p>{cohort.program_summary || "Open for applications now."}</p>
                <span className="prog-select__cta">Apply Now →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="apply-shell__success">
        <h5>Application Received</h5>
        <p>
          Your application for {selectedCohort.program_title} / {selectedCohort.name} was submitted
          successfully.
        </p>
        {openCohorts.length > 1 ? (
          <button
            className="apply-shell__back"
            type="button"
            onClick={() => {
              setSelectedCohortId(null);
              setFormResolution(null);
              setSubmitted(false);
              setSubmitError("");
            }}
          >
            ← Back to Cohorts
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="apply-shell">
      {openCohorts.length > 1 ? (
        <button
          className="apply-shell__back"
          type="button"
          onClick={() => {
            setSelectedCohortId(null);
            setFormResolution(null);
            setFormError("");
            setSubmitError("");
          }}
        >
          ← Back to Cohorts
        </button>
      ) : null}

      <div className="apply-shell__hero">
        <div className="apply-shell__hero-copy">
          <p className="apply-shell__eyebrow">{selectedCohort.program_title}</p>
          <h5>{selectedCohort.name}</h5>
          <p>
            {selectedCohort.program_summary ||
              "Complete the form below to apply to this cohort."}
          </p>
        </div>
        {selectedCohort.program_image_url ? (
          <div className="apply-shell__hero-media">
            <img src={selectedCohort.program_image_url} alt={selectedCohort.program_title} />
          </div>
        ) : null}
      </div>

      {loadingForm ? <div className="apply-shell__loading">Loading application form...</div> : null}
      {formError ? <p className="apply-form__status apply-form__status--error">{formError}</p> : null}

      {!loadingForm && formResolution ? (
        <DynamicApplicationForm
          key={`cohort-${Number(selectedCohort.id)}-${formResolution.resolved_form.id}-${formResolution.resolved_form.updated_at}`}
          formKey={`cohort-${Number(selectedCohort.id)}-${formResolution.resolved_form.updated_at}`}
          fields={formResolution.resolved_form.fields}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
          submitLabel="Submit Application"
          hiddenFieldNames={["program_id"]}
          initialAnswers={initialAnswers}
        />
      ) : null}
    </div>
  );
}
