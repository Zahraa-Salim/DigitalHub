// File: frontend/src/components/inner-pages/apply/ApplyArea.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
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
    "Fill in your details and submit your general program application. This form is managed from the dashboard General Apply form settings.",
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
