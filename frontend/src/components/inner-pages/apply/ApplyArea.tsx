// File: frontend/src/components/inner-pages/apply/ApplyArea.tsx
// Purpose: Renders the apply area UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

"use client";

import ApplicationForm from "@/forms/ApplicationForm";
import GeneralApplyForm from "@/forms/GeneralApplyForm";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsString } from "@/lib/cmsContent";

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

  const page = useCmsPage("apply");
  const content = page?.content ?? null;
  const cohortTitle = getCmsString(
    content,
    ["cohort_hero_title", "cohortHeroTitle"],
    "Apply to a Cohort",
  );
  const cohortDescription = getCmsString(
    content,
    ["cohort_hero_subtitle", "cohortHeroSubtitle"],
    "Fill in your details and submit your cohort application. If the cohort has a custom form, it will load automatically; otherwise the general form is used.",
  );
  const programTitle = getCmsString(
    content,
    ["hero_title", "heroTitle", "program_hero_title", "programHeroTitle"],
    "Apply to a Program",
  );
  const programDescription = getCmsString(
    content,
    ["hero_subtitle", "heroSubtitle", "program_hero_subtitle", "programHeroSubtitle"],
    "Choose a program first, then complete the application form assigned to that program. If no custom form is set, the general application form will be used.",
  );

  return (
    <section className="contact-area apply-area section-py-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="contact-form-wrap">
              <h4 className="title">{isCohortMode ? cohortTitle : programTitle}</h4>
              {isCohortMode ? (
                <p>{cohortDescription}</p>
              ) : (
                <p>{programDescription}</p>
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

