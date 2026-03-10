// File: frontend/src/components/inner-pages/about-us/About.tsx
// Purpose: Renders the about UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";
import { useEffect, useState } from "react";

import aboutHeroImage from "@/assets/img/others/inner_about_img.png";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsNumber, getCmsRecordArray, getCmsString, getCmsStringArray } from "@/lib/cmsContent";
import { resolveCmsImage } from "@/lib/cmsImageResolver";
import {
  listPublicCohorts,
  listPublicInstructors,
  listPublicManagers,
  listPublicPrograms,
  listPublicStudents,
} from "@/lib/publicApi";

type AboutStats = {
  programs: number;
  cohorts: number;
  openCohorts: number;
  students: number;
  instructors: number;
};

const defaultStats: AboutStats = {
  programs: 12,
  cohorts: 53,
  openCohorts: 12,
  students: 320,
  instructors: 24,
};

const FALLBACK_METRIC_CARDS: Record<string, unknown>[] = [
  {
    metric_key: "team_number",
    label: "Team Members",
    description: "Instructors and managers supporting delivery and coaching.",
    suffix: "+",
  },
  {
    metric_key: "programs",
    label: "Programs",
    description: "Active and upcoming tracks aligned with market needs.",
    suffix: "+",
  },
  {
    metric_key: "cohorts_made",
    label: "Cohorts Created",
    description: "Cohorts launched across completed, running, open, and planned cycles.",
    suffix: "+",
  },
  {
    metric_key: "participants",
    label: "Participants",
    description: "Participants currently tracked in the system.",
    suffix: "+",
  },
];

const FALLBACK_OUTCOME_KPI_CARDS: Record<string, unknown>[] = [
  {
    metric_key: "cohorts_made",
    label: "Cohorts Made",
    description: "Total cohorts created and managed in the platform.",
    suffix: "+",
  },
  {
    metric_key: "participants",
    label: "Participants",
    description: "Current participant count across active records.",
    suffix: "+",
  },
  {
    metric_key: "team_number",
    label: "Team Number",
    description: "Combined instructors and management team supporting delivery.",
    suffix: "+",
  },
  {
    metric_key: "programs",
    label: "Programs",
    description: "Program names are loaded below directly from the database.",
    suffix: "+",
  },
];

const FALLBACK_FOCUS_CARDS: Record<string, unknown>[] = [
  {
    title: "Applied Learning",
    description: "Learners build real deliverables, not just exercises, throughout each program.",
  },
  {
    title: "Mentor Feedback Loops",
    description: "Regular review cycles keep learners aligned with quality standards and deadlines.",
  },
  {
    title: "Career Readiness",
    description: "Training includes portfolio direction, communication practice, and execution habits.",
  },
];

const FALLBACK_JOURNEY_CARDS: Record<string, unknown>[] = [
  {
    step: "Step 01",
    title: "Foundations",
    description: "Learners build strong fundamentals with practical labs and guided assignments.",
  },
  {
    step: "Step 02",
    title: "Project Execution",
    description: "Participants work on scoped projects that mirror professional delivery expectations.",
  },
  {
    step: "Step 03",
    title: "Career Positioning",
    description: "Final outputs are refined for hiring readiness, portfolio quality, and interviews.",
  },
];

const FALLBACK_PROGRAM_NAMES = [
  "Full Stack Development",
  "Backend Engineering",
  "Frontend Engineering",
  "UI/UX Design",
  "Data & BI",
  "DevOps & Cloud",
  "Mobile Development",
  "QA Automation",
];

const FALLBACK_METRIC_VALUES: Record<string, number> = {
  programs: 12,
  programs_count: 12,
  cohorts: 53,
  cohorts_made: 53,
  cohorts_created: 53,
  open_cohorts: 12,
  open_cohorts_count: 12,
  participants: 320,
  participants_count: 320,
  students: 320,
  team: 24,
  team_number: 24,
  team_members: 24,
  instructors: 24,
};

const About = () => {
  const [stats, setStats] = useState<AboutStats>(defaultStats);
  const [programNames, setProgramNames] = useState<string[]>([]);

  const page = useCmsPage("about");
  const content = page?.content ?? null;

  const normalizeMetricKey = (value: string) =>
    value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  const parseNumberish = (value: string) => {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  };

  const heroTag = getCmsString(content, ["hero_tag", "heroTag", "tagline", "tag_line"], "About Digital Hub");
  const heroTitlePrimary = getCmsString(
    content,
    ["hero_title_primary", "heroTitlePrimary", "hero_title", "heroTitle", "title"],
    "Practical Training For",
  );
  const heroTitleHighlight = getCmsString(
    content,
    ["hero_title_highlight", "heroTitleHighlight", "hero_highlight", "heroHighlight"],
    "Career Outcomes",
  );
  const heroDescription = getCmsString(
    content,
    ["hero_subtitle", "heroSubtitle", "subtitle", "description", "text"],
    "Digital Hub helps learners move from theory to execution through project-based programs, hands-on mentorship, and structured support.",
  );
  const heroPills = getCmsStringArray(content, ["hero_pills", "heroPills", "pills"], [
    "Industry-led tracks",
    "Portfolio-focused delivery",
    "Career readiness support",
  ]);
  const primaryCtaText = getCmsString(content, ["primary_cta_text", "primaryCtaText", "cta_text", "ctaText"], "Apply Now");
  const primaryCtaLink = getCmsString(content, ["primary_cta_link", "primaryCtaLink", "cta_link", "ctaLink"], "/apply");
  const secondaryCtaText = getCmsString(content, ["secondary_cta_text", "secondaryCtaText"], "Browse Programs");
  const secondaryCtaLink = getCmsString(content, ["secondary_cta_link", "secondaryCtaLink"], "/programs");

  const metricCardsRaw = getCmsRecordArray(content, ["metric_cards", "metricCards"]);
  const outcomeKpiCardsRaw = getCmsRecordArray(content, ["outcome_kpi_cards", "outcomeKpiCards"]);
  const focusCardsRaw = getCmsRecordArray(content, ["focus_cards", "focusCards"]);
  const journeyCardsRaw = getCmsRecordArray(content, ["journey_cards", "journeyCards"]);

  const metricCards = metricCardsRaw.length ? metricCardsRaw : FALLBACK_METRIC_CARDS;
  const outcomeKpiCards = outcomeKpiCardsRaw.length ? outcomeKpiCardsRaw : FALLBACK_OUTCOME_KPI_CARDS;
  const focusCards = focusCardsRaw.length ? focusCardsRaw : FALLBACK_FOCUS_CARDS;
  const journeyCards = journeyCardsRaw.length ? journeyCardsRaw : FALLBACK_JOURNEY_CARDS;

  const outcomesEyebrow = getCmsString(content, ["outcomes_eyebrow", "outcomesEyebrow"], "How We Measure Outcomes");
  const outcomesTitle = getCmsString(content, ["outcomes_title", "outcomesTitle"], "Delivery Metrics");
  const outcomesDescription = getCmsString(
    content,
    ["outcomes_description", "outcomesDescription"],
    "These KPI cards are calculated from live platform data and tracked continuously.",
  );

  const programsEyebrow = getCmsString(content, ["programs_eyebrow", "programsEyebrow"], "Programs");
  const programsTitle = getCmsString(content, ["programs_title", "programsTitle"], "Program Names");
  const programsDescription = getCmsString(
    content,
    ["programs_description", "programsDescription"],
    "Current programs delivered across the Digital Hub learning model.",
  );
  const programsCardLimit = getCmsNumber(content, ["program_names_limit", "programNamesLimit"], 8, 1, 24);

  const focusEyebrow = getCmsString(content, ["focus_eyebrow", "focusEyebrow"], "What We Deliver");
  const focusTitle = getCmsString(content, ["focus_title", "focusTitle"], "How The Learning Experience Works");
  const focusDescription = getCmsString(
    content,
    ["focus_description", "focusDescription"],
    "Our model combines technical depth, mentor support, and clear execution standards so learners build real momentum.",
  );

  const journeyEyebrow = getCmsString(content, ["journey_eyebrow", "journeyEyebrow"], "Mission In Action");
  const journeyTitle = getCmsString(content, ["journey_title", "journeyTitle"], "From Learning To Delivery");
  const journeyDescription = getCmsString(
    content,
    ["journey_description", "journeyDescription"],
    "Every step is designed to move participants from core skills to real project execution.",
  );

  const heroImage = resolveCmsImage(
    getCmsString(content, ["hero_image_url", "heroImageUrl", "image_url", "imageUrl"], ""),
    { "inner_about_img.png": aboutHeroImage },
    aboutHeroImage,
  );

  const summaryMetricCards = metricCards;
  const cmsFallbackProgramNames = getCmsStringArray(content, ["program_names", "programNames"], FALLBACK_PROGRAM_NAMES);
  const effectiveProgramNames = programNames.length ? programNames : cmsFallbackProgramNames;
  const visibleProgramNames = effectiveProgramNames.slice(0, programsCardLimit);

  const metricsByKey: Record<string, number> = {
    programs: stats.programs,
    programs_count: stats.programs,
    cohorts: stats.cohorts,
    cohorts_made: stats.cohorts,
    cohorts_created: stats.cohorts,
    open_cohorts: stats.openCohorts,
    open_cohorts_count: stats.openCohorts,
    participants: stats.students,
    participants_count: stats.students,
    students: stats.students,
    team: stats.instructors,
    team_number: stats.instructors,
    team_members: stats.instructors,
    instructors: stats.instructors,
  };

  const inferMetricKeyFromCard = (card: Record<string, unknown>) => {
    const labelText = `${getCmsString(card, ["label", "title"], "")} ${getCmsString(card, ["description", "text"], "")}`.toLowerCase();
    if (labelText.includes("team") || labelText.includes("mentor") || labelText.includes("instructor")) return "team_number";
    if (labelText.includes("program")) return "programs";
    if (labelText.includes("cohort")) return "cohorts_made";
    if (labelText.includes("participant") || labelText.includes("student")) return "participants";
    return "";
  };

  const resolveMetricNumber = (card: Record<string, unknown>, index: number, sequence: string[]) => {
    const explicit = parseNumberish(getCmsString(card, ["value_override", "valueOverride", "value"], ""));
    if (explicit !== null && explicit > 0) return explicit;

    const metricKey = normalizeMetricKey(getCmsString(card, ["metric_key", "metricKey"], ""));
    const inferredKey = inferMetricKeyFromCard(card);
    const keysToTry = [metricKey, inferredKey].filter(Boolean);

    for (const key of keysToTry) {
      const liveValue = metricsByKey[key] ?? 0;
      if (liveValue > 0) return liveValue;
      const fallbackValue = FALLBACK_METRIC_VALUES[key] ?? 0;
      if (fallbackValue > 0) return fallbackValue;
    }

    const sequenceKey = sequence[Math.min(index, sequence.length - 1)] || "participants";
    const sequenceLiveValue = metricsByKey[sequenceKey] ?? 0;
    if (sequenceLiveValue > 0) return sequenceLiveValue;

    return FALLBACK_METRIC_VALUES[sequenceKey] ?? FALLBACK_METRIC_VALUES.participants;
  };

  const formatMetricValue = (card: Record<string, unknown>, index: number, sequence: string[]) => {
    const prefix = getCmsString(card, ["prefix"], "");
    const suffix = getCmsString(card, ["suffix"], "+");
    return `${prefix}${resolveMetricNumber(card, index, sequence).toLocaleString()}${suffix}`;
  };

  useEffect(() => {
    const loadAboutData = async () => {
      try {
        const [programs, cohorts, students, instructors, managers] = await Promise.all([
          listPublicPrograms(),
          listPublicCohorts({ page: 1, limit: 200, sortBy: "start_date", order: "asc" }),
          listPublicStudents({ page: 1, limit: 500, activeOnly: true }),
          listPublicInstructors(),
          listPublicManagers(),
        ]);

        const openCohorts = cohorts.filter(
          (cohort) => cohort.allow_applications && (cohort.status === "open" || cohort.status === "running")
        ).length;
        const liveProgramNames = programs
          .map((program) => (typeof program.title === "string" ? program.title.trim() : ""))
          .filter(Boolean);

        setStats({
          programs: programs.length,
          cohorts: cohorts.length,
          openCohorts,
          students: students.length,
          instructors: instructors.length + managers.length,
        });
        setProgramNames(liveProgramNames.length ? liveProgramNames : cmsFallbackProgramNames);
      } catch {
        setStats({
          programs: FALLBACK_METRIC_VALUES.programs,
          cohorts: FALLBACK_METRIC_VALUES.cohorts,
          openCohorts: FALLBACK_METRIC_VALUES.open_cohorts,
          students: FALLBACK_METRIC_VALUES.students,
          instructors: FALLBACK_METRIC_VALUES.instructors,
        });
        setProgramNames(cmsFallbackProgramNames);
      }
    };

    loadAboutData();
  }, [cmsFallbackProgramNames]);

  return (
    <section className="dh-about-pro section-py-120">
      <div className="container">
        <div className="dh-about-pro__hero">
          <div className="dh-about-pro__content">
            <span className="dh-about-pro__tag">{heroTag}</span>
            <h2 className="title">
              {heroTitlePrimary}
              <span className="dh-about-pro__highlight-wrap">
                <svg
                  x="0px"
                  y="0px"
                  preserveAspectRatio="none"
                  viewBox="0 0 209 59"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4.74438 7.70565C69.7006 -1.18799 136.097 -2.38304 203.934 4.1205C207.178 4.48495 209.422 7.14626 208.933 10.0534C206.793 23.6481 205.415 36.5704 204.801 48.8204C204.756 51.3291 202.246 53.5582 199.213 53.7955C136.093 59.7623 74.1922 60.5985 13.5091 56.3043C10.5653 56.0924 7.84371 53.7277 7.42158 51.0325C5.20725 38.2627 2.76333 25.6511 0.0898448 13.1978C-0.465589 10.5873 1.61173 8.1379 4.73327 7.70565"
                    fill="#0255E0"
                  />
                </svg>
                <span className="dh-about-pro__highlight-text">{heroTitleHighlight}</span>
              </span>
            </h2>
            <p className="desc">
              {heroDescription}
            </p>
            <div className="dh-about-pro__pills">
              {heroPills.map((pill) => <span key={pill}>{pill}</span>)}
            </div>
            <div className="dh-about-pro__cta">
              <Link to={primaryCtaLink} className="btn arrow-btn">
                {primaryCtaText} <BtnArrow />
              </Link>
              <Link to={secondaryCtaLink} className="ghost-btn">
                {secondaryCtaText}
              </Link>
            </div>
          </div>

          <div className="dh-about-pro__media">
            <div className="dh-about-pro__image-main">
              <Image src={heroImage} alt="Digital Hub learners collaborating" />
            </div>
          </div>
        </div>

        {summaryMetricCards.length ? (
          <div className="dh-about-pro__stats">
            {summaryMetricCards.map((card, index) => (
              <article
                key={`${String(getCmsString(card, ["label", "title"], "metric"))}-${index}`}
                className={`dh-about-pro__stats-item${index >= summaryMetricCards.length - 2 ? " is-alt" : ""}`}
              >
                <p className="number">{formatMetricValue(card, index, ["team_number", "programs", "cohorts_made", "participants"])}</p>
                <p className="label">{getCmsString(card, ["label", "title"], "Metric")}</p>
                <p className="desc">{getCmsString(card, ["description", "text"], "")}</p>
              </article>
            ))}
          </div>
        ) : null}

        {outcomeKpiCards.length ? (
          <section className="dh-about-pro__block">
            <div className="dh-about-pro__section-head">
              <span>{outcomesEyebrow}</span>
              <h3>{outcomesTitle}</h3>
              <p>{outcomesDescription}</p>
            </div>
            <div className="dh-about-pro__kpi-grid">
              {outcomeKpiCards.map((card, index) => (
                <article
                  key={`${String(getCmsString(card, ["label", "title"], "kpi"))}-${index}`}
                  className={`dh-about-pro__kpi-card${index >= outcomeKpiCards.length - 2 ? " is-alt" : ""}`}
                >
                  <p className="number">{formatMetricValue(card, index, ["cohorts_made", "participants", "team_number", "programs"])}</p>
                  <p className="label">{getCmsString(card, ["label", "title"], "KPI")}</p>
                  <p className="desc">{getCmsString(card, ["description", "text"], "")}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {visibleProgramNames.length ? (
          <section className="dh-about-pro__block">
            <div className="dh-about-pro__section-head">
              <span>{programsEyebrow}</span>
              <h3>{programsTitle}</h3>
              <p>{programsDescription}</p>
            </div>
            <div className="dh-about-pro__program-grid">
              {visibleProgramNames.map((programName, index) => (
                <article key={programName} className={`dh-about-pro__program-card${index >= visibleProgramNames.length - 2 ? " is-alt" : ""}`}>
                  <h4>{programName}</h4>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {focusCards.length ? (
          <section className="dh-about-pro__block">
            <div className="dh-about-pro__section-head">
              <span>{focusEyebrow}</span>
              <h3>{focusTitle}</h3>
              <p>{focusDescription}</p>
            </div>
            <div className="dh-about-pro__focus row g-4">
              {focusCards.map((card, index) => (
                <div key={`${String(card.title || "focus")}-${index}`} className="col-lg-4 col-md-6">
                  <article className={`dh-about-pro__focus-card${index >= focusCards.length - 2 ? " is-alt" : ""}`}>
                    <h4>{getCmsString(card, "title", "Focus")}</h4>
                    <p>{getCmsString(card, "description", "")}</p>
                  </article>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {journeyCards.length ? (
          <section className="dh-about-pro__block">
            <div className="dh-about-pro__section-head">
              <span>{journeyEyebrow}</span>
              <h3>{journeyTitle}</h3>
              <p>{journeyDescription}</p>
            </div>
            <div className="row g-4">
              {journeyCards.map((card, index) => (
                <div key={`${String(card.title || "step")}-${index}`} className="col-lg-4 col-md-6">
                  <article className={`dh-about-pro__journey-card${index >= journeyCards.length - 2 ? " is-alt" : ""}`}>
                    <span className="step">{getCmsString(card, ["step", "step_label", "stepLabel"], `Step ${index + 1}`)}</span>
                    <h4>{getCmsString(card, "title", "Milestone")}</h4>
                    <p>{getCmsString(card, "description", "")}</p>
                  </article>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
};

export default About;

