"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";
import {
  API_BASE_URL,
  getPublicCohortDetail,
  type PublicCohortDetail,
  type PublicCohortPerson,
} from "@/lib/publicApi";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsString } from "@/lib/cmsContent";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const toAbsolutePublicUrl = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  try {
    return `${new URL(API_BASE_URL).origin}${normalized}`;
  } catch {
    return `${API_BASE_URL.replace(/\/$/, "")}${normalized}`;
  }
};

const toInitials = (name: string) => {
  const source = String(name || "").trim();
  if (!source) return "DH";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[1]?.charAt(0) ?? "" : parts[0]?.charAt(1) ?? "";
  const value = `${first}${second}`.trim();
  return value ? value.toUpperCase() : "DH";
};

const formatDate = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
};

const formatAttendanceDays = (days?: string[] | null) => {
  if (!Array.isArray(days) || !days.length) return "N/A";
  return days
    .map((day) => String(day || "").trim())
    .filter(Boolean)
    .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
    .join(", ");
};

const formatAttendanceTime = (start?: string | null, end?: string | null) => {
  const startValue = String(start || "").trim();
  const endValue = String(end || "").trim();
  if (!startValue && !endValue) return "N/A";
  if (startValue && endValue) return `${startValue} - ${endValue}`;
  return startValue || endValue;
};

const parseSkills = (value?: string | null) =>
  String(value || "")
    .split(/[,;\n]/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 5);

const STATUS_LABELS: Record<string, string> = {
  coming_soon: "Coming Soon",
  planned: "Coming Soon",
  open: "Open",
  running: "Running",
  completed: "Completed",
  cancelled: "Unavailable",
};

const CohortPersonCard = ({
  person,
  fallbackRole,
}: {
  person: PublicCohortPerson;
  fallbackRole: string;
}) => {
  const avatar = toAbsolutePublicUrl(person.avatar_url);
  const roleText = String(person.expertise || person.cohort_role || person.enrollment_status || fallbackRole).trim();
  const skills = parseSkills(person.skills);
  const linkedin = String(person.linkedin_url || "").trim();
  const github = String(person.github_url || "").trim();
  const socialLinks = [
    linkedin
      ? {
          key: "linkedin",
          href: linkedin,
          label: "LinkedIn",
          iconClass: "fab fa-linkedin-in",
          itemClass: "dh-instructor-card__social-item--linkedin",
        }
      : null,
    github
      ? {
          key: "github",
          href: github,
          label: "GitHub",
          iconClass: "fab fa-github",
          itemClass: "dh-instructor-card__social-item--github",
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    href: string;
    label: string;
    iconClass: string;
    itemClass: string;
  }>;

  return (
    <article className="instructor__item cohort-details__person-card">
      <div className="instructor__thumb">
        <div className="dh-instructor-card__avatar-wrap cohort-details__avatar-wrap">
          {avatar ? (
            <Image className="dh-instructor-card__avatar-image" src={avatar} alt={person.full_name} />
          ) : (
            <span className="dh-instructor-card__avatar-fallback" aria-hidden="true">
              {toInitials(person.full_name)}
            </span>
          )}
        </div>
      </div>
      <div className="instructor__content cohort-details__person-body">
        <h2 className="title">{person.full_name}</h2>
        <span className="designation">{roleText || fallbackRole}</span>
        {skills.length ? (
          <div className="cohort-details__person-skills">
            {skills.map((skill) => (
              <span key={`${person.user_id}-${skill}`}>{skill}</span>
            ))}
          </div>
        ) : null}
        {socialLinks.length ? (
          <div className="instructor__social cohort-details__person-social">
            <ul className="list-wrap dh-instructor-card__social-list">
              {socialLinks.map((social) => (
                <li key={`${person.user_id}-${social.key}`} className={`dh-instructor-card__social-item ${social.itemClass}`}>
                  <a href={social.href} target="_blank" rel="noreferrer" aria-label={social.label}>
                    <i className={social.iconClass} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
};

const CohortDetailsArea = () => {
  const { id } = useParams<{ id: string }>();
  const page = useCmsPage("cohort_details");
  const content = page?.content ?? null;
  const [cohort, setCohort] = useState<PublicCohortDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cohortNotFoundText = getCmsString(content, ["error_not_found_text", "errorNotFoundText"], "Cohort not found.");
  const cohortLoadErrorText = getCmsString(content, ["error_load_text", "errorLoadText"], "Unable to load cohort details right now.");
  const backToProgramsText = getCmsString(content, ["back_to_programs_text", "backToProgramsText"], "Back to Programs");
  const mentorsTitle = getCmsString(content, ["mentors_title", "mentorsTitle"], "Mentors");
  const mentorsEmptyText = getCmsString(content, ["mentors_empty_text", "mentorsEmptyText"], "No mentors are assigned to this cohort yet.");
  const participantsTitle = getCmsString(content, ["participants_title", "participantsTitle"], "Participants");
  const participantsEmptyText = getCmsString(
    content,
    ["participants_empty_text", "participantsEmptyText"],
    "No public participants are listed for this cohort yet.",
  );
  const sidebarTitle = getCmsString(content, ["sidebar_title", "sidebarTitle"], "Program Information");
  const sidebarStatusLabel = getCmsString(content, ["status_label", "statusLabel"], "Status");
  const sidebarProgramLabel = getCmsString(content, ["program_label", "programLabel"], "Program");
  const sidebarStartDateLabel = getCmsString(content, ["start_date_label", "startDateLabel"], "Start Date");
  const sidebarEndDateLabel = getCmsString(content, ["end_date_label", "endDateLabel"], "End Date");
  const sidebarAttendanceDaysLabel = getCmsString(content, ["attendance_days_label", "attendanceDaysLabel"], "Attendance Days");
  const sidebarAttendanceTimeLabel = getCmsString(content, ["attendance_time_label", "attendanceTimeLabel"], "Attendance Time");
  const heroStartsLabel = getCmsString(content, ["hero_starts_label", "heroStartsLabel"], "Starts");
  const heroDurationLabel = getCmsString(content, ["hero_duration_label", "heroDurationLabel"], "Duration");
  const heroLevelLabel = getCmsString(content, ["hero_level_label", "heroLevelLabel"], "Level");
  const heroLevelValue = getCmsString(content, ["hero_level_value", "heroLevelValue"], "Professional");
  const metaStartLabel = getCmsString(content, ["meta_start_label", "metaStartLabel"], "Start");
  const metaEndLabel = getCmsString(content, ["meta_end_label", "metaEndLabel"], "End");
  const metaAttendanceLabel = getCmsString(content, ["meta_attendance_label", "metaAttendanceLabel"], "Attendance");
  const ctaApplyFutureText = getCmsString(content, ["cta_apply_future_text", "ctaApplyFutureText"], "Apply for Future Programs");
  const ctaApplyNowText = getCmsString(content, ["cta_apply_now_text", "ctaApplyNowText"], "Apply Now");

  useEffect(() => {
    let active = true;

    const load = async () => {
      const cohortId = Number(id);
      if (!Number.isInteger(cohortId) || cohortId <= 0) {
        setError(cohortNotFoundText);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getPublicCohortDetail(cohortId);
        if (!active) return;
        setCohort(data);
        setError(null);
      } catch {
        if (!active) return;
        setCohort(null);
        setError(cohortLoadErrorText);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [id, cohortLoadErrorText, cohortNotFoundText]);

  const statusText = STATUS_LABELS[String(cohort?.status || "").toLowerCase()] || "Cohort";
  const isFuture = cohort?.status === "coming_soon" || cohort?.status === "planned";
  const isOpen = cohort?.status === "open";

  const applyCta = useMemo(() => {
    if (!cohort) return null;
    if (isFuture) return { href: "/apply", label: ctaApplyFutureText };
    if (isOpen) return { href: `/apply?cohortId=${cohort.id}`, label: ctaApplyNowText };
    return null;
  }, [cohort, ctaApplyFutureText, ctaApplyNowText, isFuture, isOpen]);

  return (
    <section className="courses__details-area section-py-120 cohort-details">
      <div className="container">
        {loading ? (
          <div className="cohort-details__skeleton" aria-hidden>
            <div className="cohort-details__skeleton-main" />
            <div className="cohort-details__skeleton-side" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="cohort-details__error">
            <p>{error}</p>
            <Link to="/programs" className="btn btn-two">
              {backToProgramsText}
            </Link>
          </div>
        ) : null}

        {!loading && !error && cohort ? (
          <div className="row">
            <div className="col-xl-8 col-lg-7">
              <div className="courses__details-thumb cohort-details__thumb">
                {toAbsolutePublicUrl(cohort.program_image_url) ? (
                  <Image src={toAbsolutePublicUrl(cohort.program_image_url)!} alt={cohort.program_title} />
                ) : (
                  <div className="cohort-details__thumb-fallback cohort-details__hero-section">
                    <div className="cohort-hero__background" />
                    <div className="cohort-hero__content">
                      <div className="cohort-hero__status-badge">{statusText}</div>
                      <h1 className="cohort-hero__title">{cohort.name}</h1>
                      <p className="cohort-hero__program">{cohort.program_title}</p>
                      <div className="cohort-hero__info-grid">
                        <div className="cohort-hero__info-item">
                          <i className="flaticon-calendar" />
                          <span className="cohort-hero__info-label">{heroStartsLabel}</span>
                          <span className="cohort-hero__info-value">{formatDate(cohort.start_date)}</span>
                        </div>
                        <div className="cohort-hero__info-item">
                          <i className="flaticon-clock" />
                          <span className="cohort-hero__info-label">{heroDurationLabel}</span>
                          <span className="cohort-hero__info-value">{formatAttendanceDays(cohort.attendance_days)}</span>
                        </div>
                        <div className="cohort-hero__info-item">
                          <i className="flaticon-mortarboard" />
                          <span className="cohort-hero__info-label">{heroLevelLabel}</span>
                          <span className="cohort-hero__info-value">{heroLevelValue}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="courses__details-content">
                <ul className="courses__item-meta list-wrap">
                  <li className="courses__item-tag">
                    <Link to="/programs">{cohort.program_title}</Link>
                  </li>
                  <li className="avg-rating">{statusText}</li>
                </ul>

                <h2 className="title">{cohort.name}</h2>

                <div className="courses__details-meta">
                  <ul className="list-wrap">
                    <li className="date">
                      <i className="flaticon-calendar" />
                      {metaStartLabel}: {formatDate(cohort.start_date)}
                    </li>
                    <li>
                      <i className="flaticon-calendar" />
                      {metaEndLabel}: {formatDate(cohort.end_date)}
                    </li>
                    <li>
                      <i className="flaticon-mortarboard" />
                      {metaAttendanceLabel}: {formatAttendanceDays(cohort.attendance_days)}
                    </li>
                  </ul>
                </div>

                <div className="courses__overview-wrap cohort-details__section">
                  <h3 className="title">{mentorsTitle}</h3>
                  {cohort.instructors.length ? (
                    <div className="cohort-details__person-list">
                      {cohort.instructors.map((person) => (
                        <CohortPersonCard key={`ins-${person.user_id}`} person={person} fallbackRole="Instructor" />
                      ))}
                    </div>
                  ) : (
                    <p>{mentorsEmptyText}</p>
                  )}
                </div>

                <div className="courses__overview-wrap cohort-details__section">
                  <h3 className="title">{participantsTitle}</h3>
                  {cohort.students.length ? (
                    <div className="cohort-details__person-list">
                      {cohort.students.map((person) => (
                        <CohortPersonCard key={`stu-${person.user_id}`} person={person} fallbackRole="Student" />
                      ))}
                    </div>
                  ) : (
                    <p>{participantsEmptyText}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-xl-4 col-lg-5">
              <aside className="courses__details-sidebar cohort-details__sidebar">
                <div className="courses__information-wrap">
                  <h5 className="title">{sidebarTitle}</h5>
                  <ul className="list-wrap">
                    <li>
                      {sidebarStatusLabel} <span>{statusText}</span>
                    </li>
                    <li>
                      {sidebarProgramLabel} <span>{cohort.program_title}</span>
                    </li>
                    <li>
                      {sidebarStartDateLabel} <span>{formatDate(cohort.start_date)}</span>
                    </li>
                    <li>
                      {sidebarEndDateLabel} <span>{formatDate(cohort.end_date)}</span>
                    </li>
                    <li>
                      {sidebarAttendanceDaysLabel} <span>{formatAttendanceDays(cohort.attendance_days)}</span>
                    </li>
                    <li>
                      {sidebarAttendanceTimeLabel}{" "}
                      <span>{formatAttendanceTime(cohort.attendance_start_time, cohort.attendance_end_time)}</span>
                    </li>
                  </ul>
                </div>

                {applyCta ? (
                  <div className="courses__details-enroll cohort-details__apply">
                    <div className="tg-button-wrap">
                      <Link to={applyCta.href} className="btn btn-two arrow-btn">
                        {applyCta.label}
                        <BtnArrow />
                      </Link>
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default CohortDetailsArea;
