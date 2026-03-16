import { useEffect, useMemo, useState } from "react";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";
import aboutHeroImage from "@/assets/img/others/inner_about_img.png";
import { getCmsNumber, getCmsRecordArray, getCmsString, getCmsStringArray } from "@/lib/cmsContent";
import { resolveCmsImage } from "@/lib/cmsImageResolver";
import {
  listPublicCohorts,
  listPublicInstructors,
  listPublicManagers,
  listPublicPrograms,
  listPublicStudents,
} from "@/lib/publicApi";
import { useEditor } from "../EditorContext";
import { EditablePageImage } from "../EditablePageImage";
import { EditablePageSpan } from "../EditablePageSpan";

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
  { metric_key: "team_number", label: "Team Members", description: "Instructors and managers supporting delivery and coaching.", suffix: "+" },
  { metric_key: "programs", label: "Programs", description: "Active and upcoming tracks aligned with market needs.", suffix: "+" },
  { metric_key: "cohorts_made", label: "Cohorts Created", description: "Cohorts launched across completed, running, open, and planned cycles.", suffix: "+" },
  { metric_key: "participants", label: "Participants", description: "Participants currently tracked in the system.", suffix: "+" },
];

const FALLBACK_OUTCOME_KPI_CARDS: Record<string, unknown>[] = [
  { metric_key: "cohorts_made", label: "Cohorts Made", description: "Total cohorts created and managed in the platform.", suffix: "+" },
  { metric_key: "participants", label: "Participants", description: "Current participant count across active records.", suffix: "+" },
  { metric_key: "team_number", label: "Team Number", description: "Combined instructors and management team supporting delivery.", suffix: "+" },
  { metric_key: "programs", label: "Programs", description: "Program names are loaded below directly from the database.", suffix: "+" },
];

const FALLBACK_FOCUS_CARDS: Record<string, unknown>[] = [
  { title: "Applied Learning", description: "Learners build real deliverables, not just exercises, throughout each program." },
  { title: "Mentor Feedback Loops", description: "Regular review cycles keep learners aligned with quality standards and deadlines." },
  { title: "Career Readiness", description: "Training includes portfolio direction, communication practice, and execution habits." },
];

const FALLBACK_JOURNEY_CARDS: Record<string, unknown>[] = [
  { step: "Step 01", title: "Foundations", description: "Learners build strong fundamentals with practical labs and guided assignments." },
  { step: "Step 02", title: "Project Execution", description: "Participants work on scoped projects that mirror professional delivery expectations." },
  { step: "Step 03", title: "Career Positioning", description: "Final outputs are refined for hiring readiness, portfolio quality, and interviews." },
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function AboutPageEditorPreview() {
  const { pages, getPageValue } = useEditor();
  const [stats, setStats] = useState<AboutStats>(defaultStats);
  const [programNames, setProgramNames] = useState<string[]>([]);
  const aboutContent = pages.about?.local ?? {};
  const hasBuilderSections = Array.isArray(aboutContent.__builder_sections) && (aboutContent.__builder_sections as unknown[]).length > 0;
  const aboutPage = pages.about;
  const content = isRecord(aboutPage?.local) ? aboutPage.local : {};
  const missingPage = !aboutPage || aboutPage.id === 0;

  const heroPills = getCmsStringArray(content, ["hero_pills", "heroPills", "pills"], [
    "Industry-led tracks",
    "Portfolio-focused delivery",
    "Career readiness support",
  ]);
  const metricCardsRaw = getCmsRecordArray(content, ["metric_cards", "metricCards"]);
  const outcomeKpiCardsRaw = getCmsRecordArray(content, ["outcome_kpi_cards", "outcomeKpiCards"]);
  const focusCardsRaw = getCmsRecordArray(content, ["focus_cards", "focusCards"]);
  const journeyCardsRaw = getCmsRecordArray(content, ["journey_cards", "journeyCards"]);
  const metricCards = metricCardsRaw.length ? metricCardsRaw : FALLBACK_METRIC_CARDS;
  const outcomeKpiCards = outcomeKpiCardsRaw.length ? outcomeKpiCardsRaw : FALLBACK_OUTCOME_KPI_CARDS;
  const focusCards = focusCardsRaw.length ? focusCardsRaw : FALLBACK_FOCUS_CARDS;
  const journeyCards = journeyCardsRaw.length ? journeyCardsRaw : FALLBACK_JOURNEY_CARDS;
  const programsCardLimit = getCmsNumber(content, ["program_names_limit", "programNamesLimit"], 8, 1, 24);
  const cmsFallbackProgramNames = getCmsStringArray(content, ["program_names", "programNames"], FALLBACK_PROGRAM_NAMES);
  const effectiveProgramNames = programNames.length ? programNames : cmsFallbackProgramNames;
  const visibleProgramNames = effectiveProgramNames.slice(0, programsCardLimit);
  const previewHeroImage = resolveCmsImage(
    getPageValue("about", "hero_image_url"),
    { "inner_about_img.png": aboutHeroImage },
    aboutHeroImage,
  );

  const metricsByKey: Record<string, number> = useMemo(() => ({
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
  }), [stats]);

  const normalizeMetricKey = (value: string) =>
    value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  const parseNumberish = (value: string) => {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
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
          (cohort) => cohort.allow_applications && (cohort.status === "open" || cohort.status === "running"),
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

    void loadAboutData();
  }, [cmsFallbackProgramNames]);

  return (
    <>
      <section
        className="breadcrumb__area breadcrumb__bg tg-motion-effects cms-page-preview-breadcrumb"
        style={{ backgroundImage: "url(/assets/img/bg/breadcrumb_bg.jpg)" }}
      >
        <div className="container">
          <div className="row">
            <div className="col-xl-6 col-lg-8">
              <div className="breadcrumb__content">
                <h3 className="title">
                  <EditablePageSpan
                    pageKey="about"
                    field="title"
                    fallback="Build skills. Become employable."
                  />
                </h3>
                <nav className="breadcrumb">
                  <span>
                    <Link to="/" onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                      Home
                    </Link>
                  </span>
                  <span className="breadcrumb-separator">
                    <i className="fas fa-angle-right"></i>
                  </span>
                  <span>
                    <EditablePageSpan pageKey="about" field="label" fallback="About Us" />
                  </span>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dh-about-pro section-py-120">
        {missingPage ? (
          <div className="container" style={{ marginBottom: "2rem" }}>
            <div className="cms-page-editor" style={{ padding: 0 }}>
              <p className="cms-page-editor__hint">
                About page content is missing in the CMS. Create a page with the key "<em>about</em>" in CMS &gt; Pages to save edits.
              </p>
            </div>
          </div>
        ) : null}
        {hasBuilderSections ? (
          <div className="cms-edit-array-hint" style={{
            display: "block",
            margin: "12px 16px",
            padding: "10px 14px",
            background: "rgba(67,97,238,0.08)",
            borderRadius: 8,
            fontSize: 13,
            color: "#4361ee",
            lineHeight: 1.5,
          }}>
            Warning: This page has content from the About Builder ({(aboutContent.__builder_sections as unknown[]).length} sections).
            The fields below are the basic CMS fields shown in the Visual Editor preview.
            To edit the full page layout, use <strong>CMS -&gt; About Builder</strong>.
          </div>
        ) : null}

        <div className="container">
          <div className="dh-about-pro__hero">
            <div className="dh-about-pro__content">
              <EditablePageSpan pageKey="about" field="hero_tag" fallback="About Digital Hub" tag="span" className="dh-about-pro__tag" />
              <h2 className="title">
                <EditablePageSpan pageKey="about" field="hero_title_primary" fallback="Practical Training For" />
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
                  <EditablePageSpan
                    pageKey="about"
                    field="hero_title_highlight"
                    fallback="Career Outcomes"
                    className="dh-about-pro__highlight-text"
                  />
                </span>
              </h2>
              <p className="desc">
                <EditablePageSpan
                  pageKey="about"
                  field="hero_subtitle"
                  fallback="Digital Hub helps learners move from theory to execution through project-based programs, hands-on mentorship, and structured support."
                  multiline
                />
              </p>
              <div className="dh-about-pro__pills">
                {heroPills.map((pill) => <span key={pill}>{pill}</span>)}
                <span className="cms-edit-array-hint">Edit cards &amp; pills in CMS &gt; Pages</span>
              </div>
              <div className="dh-about-pro__cta">
                <Link to={getPageValue("about", "primary_cta_link") || "/apply"} className="btn arrow-btn" onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                  <EditablePageSpan pageKey="about" field="primary_cta_text" fallback="Apply Now" /> <BtnArrow />
                </Link>
                <Link to={getPageValue("about", "secondary_cta_link") || "/programs"} className="ghost-btn" onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                  <EditablePageSpan pageKey="about" field="secondary_cta_text" fallback="Browse Programs" />
                </Link>
              </div>
            </div>

            <div className="dh-about-pro__media">
              <div className="dh-about-pro__image-main">
                <EditablePageImage
                  pageKey="about"
                  field="hero_image_url"
                  fallbackSrc={aboutHeroImage}
                  previewSrc={previewHeroImage}
                  alt="Digital Hub learners collaborating"
                />
              </div>
            </div>
          </div>

          {metricCards.length ? (
            <div className="dh-about-pro__stats">
              {metricCards.map((card, index) => (
                <article
                  key={`${String(getCmsString(card, ["label", "title"], "metric"))}-${index}`}
                  className={`dh-about-pro__stats-item${index >= metricCards.length - 2 ? " is-alt" : ""}`}
                >
                  <p className="number">{formatMetricValue(card, index, ["team_number", "programs", "cohorts_made", "participants"])}</p>
                  <p className="label">{getCmsString(card, ["label", "title"], "Metric")}</p>
                  <p className="desc">{getCmsString(card, ["description", "text"], "")}</p>
                </article>
              ))}
              <span className="cms-edit-array-hint">Edit cards &amp; pills in CMS &gt; Pages</span>
            </div>
          ) : null}

          {outcomeKpiCards.length ? (
            <section className="dh-about-pro__block">
              <div className="dh-about-pro__section-head">
                <EditablePageSpan pageKey="about" field="outcomes_eyebrow" fallback="How We Measure Outcomes" tag="span" />
                <EditablePageSpan pageKey="about" field="outcomes_title" fallback="Delivery Metrics" tag="h3" />
                <p>
                  <EditablePageSpan
                    pageKey="about"
                    field="outcomes_description"
                    fallback="These KPI cards are calculated from live platform data and tracked continuously."
                    multiline
                  />
                </p>
                <span className="cms-edit-array-hint">Edit cards &amp; pills in CMS &gt; Pages</span>
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
                <EditablePageSpan pageKey="about" field="programs_eyebrow" fallback="Programs" tag="span" />
                <EditablePageSpan pageKey="about" field="programs_title" fallback="Program Names" tag="h3" />
                <p>
                  <EditablePageSpan
                    pageKey="about"
                    field="programs_description"
                    fallback="Current programs delivered across the Digital Hub learning model."
                    multiline
                  />
                </p>
                <span className="cms-edit-array-hint">Edit cards &amp; pills in CMS &gt; Pages</span>
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
                <EditablePageSpan pageKey="about" field="focus_eyebrow" fallback="What We Deliver" tag="span" />
                <EditablePageSpan pageKey="about" field="focus_title" fallback="How The Learning Experience Works" tag="h3" />
                <p>
                  <EditablePageSpan
                    pageKey="about"
                    field="focus_description"
                    fallback="Our model combines technical depth, mentor support, and clear execution standards so learners build real momentum."
                    multiline
                  />
                </p>
                <span className="cms-edit-array-hint">Edit cards &amp; pills in CMS &gt; Pages</span>
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
                <EditablePageSpan pageKey="about" field="journey_eyebrow" fallback="Mission In Action" tag="span" />
                <EditablePageSpan pageKey="about" field="journey_title" fallback="From Learning To Delivery" tag="h3" />
                <p>
                  <EditablePageSpan
                    pageKey="about"
                    field="journey_description"
                    fallback="Every step is designed to move participants from core skills to real project execution."
                    multiline
                  />
                </p>
                <span className="cms-edit-array-hint">Edit cards &amp; pills in CMS &gt; Pages</span>
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
    </>
  );
}
