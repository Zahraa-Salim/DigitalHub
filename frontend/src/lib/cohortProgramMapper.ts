// File: frontend/src/lib/cohortProgramMapper.ts
// Purpose: Provides frontend helper logic for cohort program mapper.
// It supports shared data, API, or formatting behavior used across the app.

import { API_BASE_URL, type PublicCohort } from "@/lib/publicApi";

export type CohortProgramCard = {
  id: number;
  cohortId: number;
  detailHref: string;
  title: string;
  shortDescription: string;
  status: PublicCohort["status"];
  allowApplications: boolean;
  canEnroll: boolean;
  isComingSoon: boolean;
  isActionDisabled: boolean;
  actionHref: string;
  actionLabel: string;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  level: string;
  durationLabel: string;
  createdAt: string;
  instructorName: string;
  thumb: string;
  rating: number;
};

const COURSE_THUMBS = [
  "/assets/img/courses/course_thumb01.jpg",
  "/assets/img/courses/course_thumb02.jpg",
  "/assets/img/courses/course_thumb03.jpg",
  "/assets/img/courses/course_thumb04.jpg",
  "/assets/img/courses/course_thumb05.jpg",
  "/assets/img/courses/course_thumb06.jpg",
  "/assets/img/courses/course_thumb07.jpg",
  "/assets/img/courses/course_thumb08.jpg",
];

const resolveProgramImageUrl = (rawUrl?: string | null): string | null => {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  try {
    const api = new URL(API_BASE_URL);
    return `${api.origin}${normalized}`;
  } catch {
    return `${API_BASE_URL.replace(/\/$/, "")}${normalized}`;
  }
};

const toTitleCase = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getDurationLabel = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate || !endDate) return "Open Enrollment";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Open Enrollment";
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const weeks = Math.max(1, Math.round(days / 7));
  return `${weeks} Weeks`;
};

const getEnrollmentSummary = (cohort: PublicCohort) => {
  if (cohort.status === "coming_soon" || cohort.status === "planned") {
    return "Enrollment opens soon";
  }
  if (cohort.status === "running") {
    return "Cohort currently running";
  }
  if (cohort.status === "completed") {
    return "Cohort completed";
  }
  if (cohort.status === "cancelled") {
    return "Cohort currently unavailable";
  }

  const open = cohort.enrollment_open_at ? new Date(cohort.enrollment_open_at) : null;
  const close = cohort.enrollment_close_at ? new Date(cohort.enrollment_close_at) : null;

  if (open && close && !Number.isNaN(open.getTime()) && !Number.isNaN(close.getTime())) {
    return `Enrollment: ${open.toLocaleDateString()} - ${close.toLocaleDateString()}`;
  }

  if (close && !Number.isNaN(close.getTime())) {
    return `Enrollment closes: ${close.toLocaleDateString()}`;
  }

  return "Enrollment currently open";
};

export const mapOpenCohortsToProgramCards = (cohorts: PublicCohort[]): CohortProgramCard[] => {
  return cohorts
    .map((cohort, index) => {
      const canEnroll = cohort.status === "open" && cohort.allow_applications;
      const isComingSoon = cohort.status === "coming_soon" || cohort.status === "planned";
      const isRunningOrCompleted = cohort.status === "running" || cohort.status === "completed";
      const isCancelled = cohort.status === "cancelled";
      const detailHref = `/programs/${cohort.id}`;
      const actionHref = canEnroll
        ? `/apply?cohortId=${cohort.id}`
        : isComingSoon
          ? "/apply"
          : detailHref;
      const actionLabel = canEnroll
        ? "Enroll Now"
        : isComingSoon
          ? "Apply for Future Programs"
          : isRunningOrCompleted
            ? "View Details"
            : "Unavailable";

      return {
        id: cohort.id,
        cohortId: cohort.id,
        detailHref,
        title: cohort.name || `${cohort.program_title} Program`,
        shortDescription: getEnrollmentSummary(cohort),
        status: cohort.status,
        allowApplications: cohort.allow_applications,
        canEnroll,
        isComingSoon,
        isActionDisabled: isCancelled,
        actionHref,
        actionLabel,
        category: {
          id: cohort.program_id,
          name: cohort.program_title,
          slug: cohort.program_title.toLowerCase().replace(/\s+/g, "-"),
        },
        level: toTitleCase(cohort.status || "open"),
        durationLabel: getDurationLabel(cohort.start_date, cohort.end_date),
        createdAt: cohort.updated_at || cohort.created_at || new Date().toISOString(),
        instructorName: "Digital Hub Team",
        thumb: resolveProgramImageUrl(cohort.program_image_url) || COURSE_THUMBS[index % COURSE_THUMBS.length],
        rating: 5,
      };
    });
};

