"use client";

import ApplicationForm from "@/forms/ApplicationForm";
import GeneralApplyForm from "@/forms/GeneralApplyForm";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const ApplyArea = () => {
  const [searchParams] = useSearchParams();

  const defaultCohortId = useMemo(() => {
    const raw = searchParams.get("cohortId");
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }, [searchParams]);

  const defaultProgramId = useMemo(() => {
    const raw = searchParams.get("programId");
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }, [searchParams]);

  const defaultProgramTitle = useMemo(() => {
    const raw = searchParams.get("program");
    const value = String(raw || "").trim();
    return value || undefined;
  }, [searchParams]);

  const isCohortMode = Boolean(defaultCohortId);

  return (
    <section className="contact-area apply-area section-py-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="contact-form-wrap">
              <h4 className="title">{isCohortMode ? "Apply to a Cohort" : "Apply to a Program"}</h4>
              {isCohortMode ? (
                <p>
                  Fill in your details and submit your cohort application. If the cohort has a
                  custom form, it will load automatically; otherwise the general form is used.
                </p>
              ) : (
                <p>
                  Fill in your details and submit your general program application. This form is
                  managed from the dashboard General Apply form settings.
                </p>
              )}
              {isCohortMode ? (
                <ApplicationForm defaultCohortId={defaultCohortId} />
              ) : (
                <GeneralApplyForm defaultProgramId={defaultProgramId} defaultProgramTitle={defaultProgramTitle} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApplyArea;
