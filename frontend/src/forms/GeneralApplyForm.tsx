"use client";

import { useEffect, useMemo, useState } from "react";
import DynamicApplicationForm from "@/components/DynamicApplicationForm";
import { notifyError, notifySuccess } from "@/lib/feedbackToast";
import {
  getPublicGeneralForm,
  getPublicProgramForm,
  listPublicCohorts,
  listPublicPrograms,
  submitPublicApply,
  type PublicCohort,
  type PublicProgramFormResolution,
  type PublicProgramOption,
} from "@/lib/publicApi";

type GeneralApplyFormProps = {
  defaultProgramId?: number;
  defaultProgramTitle?: string;
};

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const resolveDefaultProgramId = (
  programs: PublicProgramOption[],
  defaultProgramId?: number,
  defaultProgramTitle?: string,
) => {
  if (defaultProgramId && programs.some((program) => Number(program.id) === defaultProgramId)) {
    return defaultProgramId;
  }

  if (defaultProgramTitle) {
    const normalizedQuery = normalize(defaultProgramTitle);
    const matchedProgram = programs.find((program) => {
      const normalizedTitle = normalize(program.title);
      const normalizedSlug = normalize(program.slug || "");
      return (
        normalizedTitle === normalizedQuery ||
        normalizedSlug === normalizedQuery ||
        normalizedTitle.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedTitle)
      );
    });
    return matchedProgram ? Number(matchedProgram.id) : null;
  }

  return null;
};

export default function GeneralApplyForm({
  defaultProgramId,
  defaultProgramTitle,
}: GeneralApplyFormProps) {
  const [programs, setPrograms] = useState<PublicProgramOption[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [programsError, setProgramsError] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(defaultProgramId ?? null);
  const [cohorts, setCohorts] = useState<PublicCohort[]>([]);
  const [formResolution, setFormResolution] = useState<PublicProgramFormResolution | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedProgram = useMemo(
    () => programs.find((program) => Number(program.id) === selectedProgramId) ?? null,
    [programs, selectedProgramId],
  );
  const initialAnswers = useMemo(
    () => (selectedProgram ? { program_id: String(selectedProgram.id) } : undefined),
    [selectedProgram],
  );
  const selectedProgramCohorts = useMemo(
    () =>
      cohorts
        .filter((cohort) => Number(cohort.program_id) === Number(selectedProgramId))
        .sort((left, right) => {
          const leftDate = left.start_date || left.updated_at || "";
          const rightDate = right.start_date || right.updated_at || "";
          return rightDate.localeCompare(leftDate);
        }),
    [cohorts, selectedProgramId],
  );

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString();
  };

  useEffect(() => {
    let active = true;

    const loadPrograms = async () => {
      setLoadingPrograms(true);
      setProgramsError("");
      try {
        const [rows, cohortRows] = await Promise.all([
          listPublicPrograms(),
          listPublicCohorts({
            page: 1,
            limit: 200,
            sortBy: "start_date",
            order: "desc",
          }).catch(() => []),
        ]);
        if (!active) return;
        setPrograms(rows);
        setCohorts(cohortRows);
        setSelectedProgramId((current) => {
          if (current && rows.some((program) => Number(program.id) === Number(current))) {
            return current;
          }
          return resolveDefaultProgramId(rows, defaultProgramId, defaultProgramTitle);
        });
      } catch (error) {
        if (!active) return;
        setPrograms([]);
        setCohorts([]);
        setProgramsError(
          error instanceof Error ? error.message : "Unable to load programs right now.",
        );
      } finally {
        if (active) {
          setLoadingPrograms(false);
        }
      }
    };

    void loadPrograms();
    return () => {
      active = false;
    };
  }, [defaultProgramId, defaultProgramTitle]);

  useEffect(() => {
    if (!selectedProgramId) {
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
        const data = await getPublicProgramForm(selectedProgramId);
        if (!active) return;
        setFormResolution(data);
      } catch (error) {
        try {
          const generalForm = await getPublicGeneralForm();
          if (!active) return;
          setFormResolution({
            program: {
              id: selectedProgramId,
              title: selectedProgram?.title || "Program",
              slug: selectedProgram?.slug ?? null,
              is_published: true,
              use_general_form: true,
              application_form_id: null,
            },
            resolved_form: generalForm,
            form_source: "general",
          });
          setFormError("");
        } catch (fallbackError) {
          if (!active) return;
          setFormResolution(null);
          setFormError(
            fallbackError instanceof Error
              ? fallbackError.message
              : error instanceof Error
                ? error.message
                : "Unable to load this application form right now.",
          );
        }
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
  }, [selectedProgram, selectedProgramId]);

  const handleSubmit = async (answers: Record<string, unknown>) => {
    if (!selectedProgram) {
      throw new Error("Select a program first.");
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await submitPublicApply({
        program_id: Number(selectedProgram.id),
        answers,
      });
      setSubmitted(true);
      notifySuccess("Application submitted successfully.", { id: "public-program-apply-success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit your application right now.";
      setSubmitError(message);
      notifyError(message, { id: "public-program-apply-error" });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPrograms) {
    return <div className="apply-shell__loading">Loading programs...</div>;
  }

  if (programsError) {
    return <p className="apply-form__status apply-form__status--error">{programsError}</p>;
  }

  if (!programs.length) {
    return <p className="apply-shell__empty">No programs are available right now.</p>;
  }

  if (submitted) {
    return (
      <div className="apply-shell__success">
        <h5>Application Received</h5>
        <p>Your application for {selectedProgram.title} was submitted successfully.</p>
        {programs.length > 1 ? (
          <button
            className="apply-shell__back"
            type="button"
            onClick={() => {
              setSelectedProgramId(null);
              setFormResolution(null);
              setSubmitted(false);
              setSubmitError("");
            }}
          >
            ← Back to Programs
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="apply-shell">
      <div className="prog-select">
        <div className="prog-select__head">
          <h5>Choose a Program</h5>
          <p>Select a program to view its details and application form.</p>
        </div>
        <div className="apply-form__group">
          <label className="apply-form__label" htmlFor="program-apply-select">
            Program<span className="apply-form__required">*</span>
          </label>
          <div className="apply-form__select-wrap">
            <select
              id="program-apply-select"
              className="apply-form__control"
              value={selectedProgramId ?? ""}
              onChange={(event) => {
                const nextValue = event.target.value ? Number(event.target.value) : null;
                setSelectedProgramId(nextValue);
                setSubmitError("");
                setFormError("");
                setSubmitted(false);
              }}
            >
              <option value="">Select a program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedProgram ? (
        <div className="apply-shell__hero">
          <div className="apply-shell__hero-copy">
            <p className="apply-shell__eyebrow">Program Application</p>
            <h5>{selectedProgram.title}</h5>
            <p>{selectedProgram.summary || "Complete the form below to submit your application."}</p>
          </div>
          {selectedProgram.image_url ? (
            <div className="apply-shell__hero-media">
              <img src={selectedProgram.image_url} alt={selectedProgram.title} />
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedProgram ? (
        <section className="apply-program-details">
          <div className="apply-program-details__section">
            <h6>Description</h6>
            <p>{selectedProgram.description || selectedProgram.summary || "Program details will appear here."}</p>
          </div>
          {selectedProgram.requirements ? (
            <div className="apply-program-details__section">
              <h6>Requirements</h6>
              <p>{selectedProgram.requirements}</p>
            </div>
          ) : null}
          <div className="apply-program-details__section">
            <h6>Cohorts</h6>
            {selectedProgramCohorts.length ? (
              <ul className="apply-program-details__cohorts">
                {selectedProgramCohorts.map((cohort) => (
                  <li key={cohort.id}>
                    <div>
                      <strong>{cohort.name}</strong>
                      <p>
                        {formatDate(cohort.start_date) && formatDate(cohort.end_date)
                          ? `${formatDate(cohort.start_date)} - ${formatDate(cohort.end_date)}`
                          : formatDate(cohort.start_date) || "Dates to be announced"}
                      </p>
                    </div>
                    <span className={`apply-program-details__status apply-program-details__status--${cohort.status}`}>
                      {String(cohort.status).replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No cohorts available yet for this program.</p>
            )}
          </div>
        </section>
      ) : null}

      {loadingForm ? <div className="apply-shell__loading">Loading application form...</div> : null}
      {formError ? <p className="apply-form__status apply-form__status--error">{formError}</p> : null}

      {!selectedProgramId ? (
        <div className="apply-shell__empty">Select a program to see its application form.</div>
      ) : null}

      {!loadingForm && selectedProgram && formResolution ? (
        <DynamicApplicationForm
          key={`program-${Number(selectedProgram.id)}-${formResolution.resolved_form.id}-${formResolution.resolved_form.updated_at}`}
          formKey={`program-${Number(selectedProgram.id)}-${formResolution.resolved_form.updated_at}`}
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
