// File: frontend/src/components/inner-pages/people/PeopleDirectory.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";
import {
  API_BASE_URL,
  getPublicStudentBySlug,
  listPublicInstructors,
  listPublicManagers,
  listPublicStudents,
  type PublicStudent,
  type PublicStudentDetail,
} from "@/lib/publicApi";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsNumber, getCmsString } from "@/lib/cmsContent";
import type { PeopleMode } from "@/data/mock/peopleDirectoryData";
import ReactPaginate from "react-paginate";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";

type PeopleDirectoryProps = {
  mode: PeopleMode;
  variant?: "page" | "featured-home";
  content?: Record<string, unknown> | null;
};

type DirectoryItem = {
  id: number | string;
  name: string;
  role: string;
  primaryTag: string;
  secondaryTag: string;
  status: string;
  bio: string;
  avatar: string | null;
  order: number;
  publicSlug?: string | null;
  headline?: string | null;
  cohortName?: string | null;
  programTitle?: string | null;
  skills?: string[];
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  cvUrl?: string | null;
  cvFileName?: string | null;
  cvUpdatedAt?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  education?: string | null;
  certifications?: string | null;
  experienceSummary?: string | null;
  cohorts?: Array<{ cohort_name?: string | null; program_title?: string | null }>;
};

type DirectorySortValue = "default" | "available_first" | "name_asc" | "name_desc";

const DIRECTORY_SORT_VALUES: DirectorySortValue[] = [
  "default",
  "available_first",
  "name_asc",
  "name_desc",
];

const DIRECTORY_PAGE_SIZE = 6;
const STUDENTS_FETCH_LIMIT = 100;
const MAX_STUDENT_FETCH_PAGES = 20;
const DEFAULT_HOME_FEATURED_LIMIT = 3;
const PARTICIPANT_STATUS_OPTIONS = ["Open to Work", "Working"] as const;

const modeText = {
  participants: {
    allPrimary: "All Participants",
    allSecondary: "All Programs",
    cta: "Contact",
  },
  team: {
    allPrimary: "All Teams",
    allSecondary: "All Skills",
    cta: "Contact",
  },
};

const sortByName = (a: string, b: string) => a.localeCompare(b);

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const parseCsvQueryParam = (value: string | null) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const resolveAvatar = (url: string | null | undefined, fallback: string) => {
  const value = String(url || "").trim();
  if (!value) return fallback;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/${value}`;
};

const isPlaceholderParticipantAvatar = (url: string | null | undefined) => {
  const value = String(url || "").trim().toLowerCase();
  if (!value) return true;
  return (
    value.includes("/assets/img/instructor/") ||
    value.includes("/assets/img/testimonial/") ||
    value.includes("/assets/img/team/")
  );
};

const resolveAssetUrl = (url: string | null | undefined) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/${value}`;
};

const parseSkillList = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
    }
  } catch {
    // Keep fallback split.
  }
  return raw
    .split(/[,;\n]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const normalizeCohorts = (
  value:
    | PublicStudent["cohorts"]
    | Array<{ cohort_name?: string | null; program_title?: string | null }>
    | null
    | undefined
) => {
  if (!Array.isArray(value)) return [] as Array<{ cohort_name?: string | null; program_title?: string | null }>;
  return value
    .map((item) => ({
      cohort_name: item?.cohort_name ? String(item.cohort_name) : null,
      program_title: item?.program_title ? String(item.program_title) : null,
    }))
    .filter((item) => item.cohort_name || item.program_title);
};

const buildLocation = (item: { location?: string | null; city?: string | null; country?: string | null }) => {
  const direct = String(item.location || "").trim();
  if (direct) return direct;
  const pieces = [item.city, item.country].map((value) => String(value || "").trim()).filter(Boolean);
  return pieces.length ? pieces.join(", ") : null;
};

const resolveStudentStatus = (student: PublicStudent) => {
  if (student.open_to_work) return "Open to Work";
  if (student.is_working) return "Working";
  if (student.is_graduated) return "Graduated";
  return "Participant";
};

const statusClassName = (status: string) => {
  if (status === "Open to Work" || status === "Available") return "is-open";
  if (status === "Working") return "is-working";
  if (status === "Graduated") return "is-neutral";
  return "is-busy";
};

const formatDate = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const buildDownloadName = (name: string, fileName?: string | null) => {
  const explicit = String(fileName || "").trim();
  if (explicit) return explicit;
  return `${name.replace(/\s+/g, "-").toLowerCase()}-cv.pdf`;
};

const toInitials = (fullName: string) => {
  const source = String(fullName || "").trim();
  if (!source) return "DH";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[1]?.charAt(0) ?? "" : parts[0]?.charAt(1) ?? "";
  const value = `${first}${second}`.trim();
  return value ? value.toUpperCase() : "DH";
};

const normalizeExternalUrl = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
    return raw;
  }
  return `https://${raw}`;
};

const mapPublicStudentToDirectoryItem = (student: PublicStudent, index: number): DirectoryItem => {
  const status = resolveStudentStatus(student);
  const cohorts = normalizeCohorts(student.cohorts);
  const programTitle =
    String(student.program_title || "").trim() ||
    String(cohorts[0]?.program_title || "").trim() ||
    "";
  const cohortName =
    String(student.cohort_name || "").trim() ||
    String(cohorts[0]?.cohort_name || "").trim() ||
    "";
  const secondaryTag = programTitle || "Program Not Set";
  const headline =
    String(student.headline || "").trim() ||
    (student.is_working
      ? "Working Participant"
      : student.is_graduated
        ? "Graduate Participant"
        : "Participant");

  return {
    id: student.user_id ?? student.public_slug ?? `student-${index}`,
    name: student.full_name || "Participant",
    role: headline,
    primaryTag: status,
    secondaryTag,
    status,
    bio: student.bio || "",
    avatar: isPlaceholderParticipantAvatar(student.avatar_url) ? null : resolveAvatar(student.avatar_url, ""),
    order: student.featured_rank ?? 100000 + index,
    publicSlug: student.public_slug ?? null,
    headline,
    cohortName: cohortName || null,
    programTitle: programTitle || null,
    skills: parseSkillList(student.skills),
    location: buildLocation(student),
    email: student.email ?? null,
    phone: student.phone ?? null,
    cvUrl: student.cv_url ?? null,
    cvFileName: student.cv_file_name ?? null,
    cvUpdatedAt: student.cv_updated_at ?? null,
    linkedinUrl: student.linkedin_url ?? null,
    githubUrl: student.github_url ?? null,
    portfolioUrl: student.portfolio_url ?? null,
    education: student.education ?? null,
    certifications: student.certifications ?? null,
    experienceSummary: student.experience_summary ?? null,
    cohorts,
  };
};

const studentIdentityKey = (student: PublicStudent) =>
  String(student.user_id ?? "").trim() || String(student.public_slug ?? "").trim() || String(student.full_name || "").trim();

const applyTemplate = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

const PeopleDirectory = ({ mode, variant = "page", content = null }: PeopleDirectoryProps) => {
  const isFeaturedHome = mode === "participants" && variant === "featured-home";
  const [searchParams, setSearchParams] = useSearchParams();
  const [source, setSource] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrimary, setSelectedPrimary] = useState<string[]>([]);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState<DirectorySortValue>("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStudent, setActiveStudent] = useState<DirectoryItem | null>(null);
  const [activeTeamMember, setActiveTeamMember] = useState<DirectoryItem | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, PublicStudentDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const pageKey = mode === "team" ? "team" : "participants";
  const page = useCmsPage(pageKey);
  const pageContent = page?.content ?? null;
  const featuredContent = isFeaturedHome ? content : null;
  const featuredLimit = Math.trunc(
    getCmsNumber(featuredContent, ["limit", "card_limit", "items_limit"], DEFAULT_HOME_FEATURED_LIMIT, 1, 24),
  );
  const primaryFilterTitleRaw = getCmsString(
    pageContent,
    ["primary_filter_title", "primaryFilterTitle"],
    modeText[mode].allPrimary,
  );
  const primaryFilterTitle =
    mode === "participants" && primaryFilterTitleRaw.trim().toLowerCase() === "all status"
      ? "All Participants"
      : primaryFilterTitleRaw;
  const secondaryFilterTitle = getCmsString(
    pageContent,
    ["secondary_filter_title", "secondaryFilterTitle"],
    modeText[mode].allSecondary,
  );
  const loadingProfilesText = getCmsString(pageContent, ["loading_profiles_text", "loadingProfilesText"], "Loading profiles...");
  const showingResultsTemplate = getCmsString(
    pageContent,
    ["showing_results_template", "showingResultsTemplate"],
    "Showing {start}-{end} of {total}",
  );
  const sortLabel = getCmsString(pageContent, ["sort_label", "sortLabel"], "Sort By:");
  const sortDefaultLabel = getCmsString(pageContent, ["sort_default_label", "sortDefaultLabel"], "Default");
  const sortAvailabilityLabel = getCmsString(
    pageContent,
    ["sort_availability_label", "sortAvailabilityLabel"],
    "Availability",
  );
  const sortNameAscLabel = getCmsString(pageContent, ["sort_name_asc_label", "sortNameAscLabel"], "Name A-Z");
  const sortNameDescLabel = getCmsString(pageContent, ["sort_name_desc_label", "sortNameDescLabel"], "Name Z-A");
  const emptyStateText = getCmsString(
    pageContent,
    ["empty_state_text", "emptyStateText"],
    "No records match your selected filters.",
  );
  const profileLoadingText = getCmsString(pageContent, ["profile_loading_text", "profileLoadingText"], "Loading profile details...");
  const profileErrorText = getCmsString(pageContent, ["profile_error_text", "profileErrorText"], "Unable to load full profile right now.");
  const aboutTitle = getCmsString(pageContent, ["about_title", "aboutTitle"], "About");
  const skillsTitle = getCmsString(pageContent, ["skills_title", "skillsTitle"], "Skills");
  const projectsTitle = getCmsString(pageContent, ["projects_title", "projectsTitle"], "Projects");
  const repoText = getCmsString(pageContent, ["repo_text", "repoText"], "Repo");
  const demoText = getCmsString(pageContent, ["demo_text", "demoText"], "Demo");
  const experienceTitle = getCmsString(pageContent, ["experience_title", "experienceTitle"], "Experience");
  const educationTitle = getCmsString(pageContent, ["education_title", "educationTitle"], "Education");
  const certificationsTitle = getCmsString(pageContent, ["certifications_title", "certificationsTitle"], "Certifications");
  const programsTitle = getCmsString(pageContent, ["programs_title", "programsTitle"], "Programs");
  const cvTitle = getCmsString(pageContent, ["cv_title", "cvTitle"], "CV");
  const cvMissingText = getCmsString(pageContent, ["cv_missing_text", "cvMissingText"], "CV not uploaded yet.");
  const cvUpdatedLabel = getCmsString(pageContent, ["cv_updated_label", "cvUpdatedLabel"], "Updated");
  const viewCvText = getCmsString(pageContent, ["view_cv_text", "viewCvText"], "View CV");
  const downloadCvText = getCmsString(pageContent, ["download_cv_text", "downloadCvText"], "Download CV");
  const contactCtaText = getCmsString(pageContent, ["contact_cta_text", "contactCtaText"], "Contact");
  const closeProfileLabel = getCmsString(pageContent, ["close_profile_label", "closeProfileLabel"], "Close profile");
  const closeModalLabel = getCmsString(pageContent, ["close_modal_label", "closeModalLabel"], "Close profile modal");
  const featuredSectionEyebrow = getCmsString(
    featuredContent,
    ["subtitle", "sub_title", "eyebrow"],
    "Featured Participants",
  );
  const featuredSectionTitle = getCmsString(
    featuredContent,
    ["title", "heading"],
    "Meet Active Participants Building Real Work",
  );
  const featuredSectionBody = getCmsString(
    featuredContent,
    ["description", "body", "text"],
    "Explore active students currently building projects, growing their skills, and contributing across Digital Hub programs.",
  );
  const featuredSectionCta = getCmsString(featuredContent, ["cta_text", "button_text"], "View All Participants");
  const featuredSectionCtaLink = getCmsString(
    featuredContent,
    ["cta_link", "button_link"],
    "/participants",
  );

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        if (mode === "participants") {
          let students: PublicStudent[] = [];

          if (isFeaturedHome) {
            const featured = await listPublicStudents({
              page: 1,
              limit: featuredLimit,
              featured: true,
              activeOnly: true,
            });
            const seen = new Set(featured.map((student) => studentIdentityKey(student)).filter(Boolean));
            students = [...featured];
            if (students.length < featuredLimit) {
              const activePool = await listPublicStudents({
                page: 1,
                limit: featuredLimit * 3,
                activeOnly: true,
              });
              activePool.forEach((student) => {
                const identityKey = studentIdentityKey(student);
                if (students.length >= featuredLimit || (identityKey && seen.has(identityKey))) return;
                if (identityKey) seen.add(identityKey);
                students.push(student);
              });
            }
          } else {
            for (let page = 1; page <= MAX_STUDENT_FETCH_PAGES; page += 1) {
              const chunk = await listPublicStudents({ page, limit: STUDENTS_FETCH_LIMIT });
              students.push(...chunk);
              if (chunk.length < STUDENTS_FETCH_LIMIT) break;
            }
          }

          const rows: DirectoryItem[] = students.map((student, index) => mapPublicStudentToDirectoryItem(student, index));

          if (!active) return;
          setSource(
            rows
              .sort((a, b) => a.order - b.order || sortByName(a.name, b.name))
              .slice(0, isFeaturedHome ? featuredLimit : rows.length)
          );
          setError(null);
          return;
        }

        const [admins, instructors] = await Promise.all([listPublicManagers(), listPublicInstructors()]);

        const adminRows: DirectoryItem[] = admins.map((admin) => ({
          id: admin.user_id,
          name: admin.full_name,
          role: admin.job_title || "Team Member",
          primaryTag: "Team",
          secondaryTag: parseSkillList(admin.skills)[0] || admin.job_title || "Management",
          status: "Available",
          bio: admin.bio || "Admin profile.",
          avatar: resolveAssetUrl(admin.avatar_url || "") || null,
          order: admin.sort_order ?? 0,
          skills: parseSkillList(admin.skills),
          linkedinUrl: admin.linkedin_url ?? null,
          githubUrl: admin.github_url ?? null,
          portfolioUrl: admin.portfolio_url ?? null,
        }));

        const instructorRows: DirectoryItem[] = instructors.map((instructor, index) => ({
          id: instructor.user_id,
          name: instructor.full_name || "Team Member",
          role: instructor.expertise || "Team Member",
          primaryTag: "Team",
          secondaryTag: instructor.expertise || "Mentorship",
          status: "Available",
          bio: instructor.bio || "Instructor profile.",
          avatar: resolveAssetUrl(instructor.avatar_url || "") || null,
          order: 1000 + index,
          skills: parseSkillList(instructor.skills),
          linkedinUrl: instructor.linkedin_url ?? null,
          githubUrl: instructor.github_url ?? null,
          portfolioUrl: instructor.portfolio_url ?? null,
        }));

        if (!active) return;
        setSource([...adminRows, ...instructorRows].sort((a, b) => a.order - b.order || sortByName(a.name, b.name)));
        setError(null);
      } catch {
        if (!active) return;
        setSource([]);
        setError(profileErrorText);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [featuredLimit, isFeaturedHome, mode, profileErrorText]);

  useEffect(() => {
    if (mode !== "participants" || isFeaturedHome) return;

    const sortFromQuery = searchParams.get("sort");
    const parsedSort: DirectorySortValue = DIRECTORY_SORT_VALUES.includes(sortFromQuery as DirectorySortValue)
      ? (sortFromQuery as DirectorySortValue)
      : "default";
    const statusFromQuery = parseCsvQueryParam(searchParams.get("status"));
    const programFromQuery = parseCsvQueryParam(searchParams.get("program") || searchParams.get("track"));
    const pageFromQuery = Number.parseInt(searchParams.get("page") || "1", 10);
    const parsedPage = Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1;

    setSortValue((current) => (current === parsedSort ? current : parsedSort));
    setCurrentPage((current) => (current === parsedPage ? current : parsedPage));
    setSelectedPrimary((current) => (arraysEqual(current, statusFromQuery) ? current : statusFromQuery));
    setSelectedSecondary((current) => (arraysEqual(current, programFromQuery) ? current : programFromQuery));
  }, [isFeaturedHome, mode, searchParams]);

  useEffect(() => {
    if (mode === "participants" && !isFeaturedHome) return;
    setSelectedPrimary([]);
    setSelectedSecondary([]);
    setSortValue("default");
    setCurrentPage(1);
  }, [isFeaturedHome, mode]);

  const primaryOptions = useMemo(() => {
    if (mode === "participants") {
      return [...PARTICIPANT_STATUS_OPTIONS];
    }
    return Array.from(new Set(source.map((item) => item.primaryTag))).sort(sortByName);
  }, [mode, source]);

  const secondaryOptions = useMemo(
    () => Array.from(new Set(source.map((item) => item.secondaryTag))).sort(sortByName),
    [source]
  );

  useEffect(() => {
    if (mode !== "participants" || isFeaturedHome || loading) return;

    setSelectedPrimary((current) => {
      const next = current.filter((item) => primaryOptions.includes(item));
      return arraysEqual(current, next) ? current : next;
    });
    setSelectedSecondary((current) => {
      const next = current.filter((item) => secondaryOptions.includes(item));
      return arraysEqual(current, next) ? current : next;
    });
  }, [isFeaturedHome, mode, loading, primaryOptions, secondaryOptions]);

  useEffect(() => {
    if (mode !== "participants" || isFeaturedHome) return;

    const next = new URLSearchParams();
    if (selectedPrimary.length) next.set("status", selectedPrimary.join(","));
    if (selectedSecondary.length) next.set("program", selectedSecondary.join(","));
    if (sortValue !== "default") next.set("sort", sortValue);
    if (currentPage > 1) next.set("page", String(currentPage));

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [isFeaturedHome, mode, selectedPrimary, selectedSecondary, sortValue, currentPage, searchParams, setSearchParams]);

  const toggleMulti = (value: string, setState: Dispatch<SetStateAction<string[]>>) => {
    setCurrentPage(1);
    setState((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  };

  const filteredItems = useMemo(() => {
    let items = [...source];

    if (selectedPrimary.length > 0) {
      items = items.filter((item) => selectedPrimary.includes(item.primaryTag));
    }

    if (selectedSecondary.length > 0) {
      items = items.filter((item) => selectedSecondary.includes(item.secondaryTag));
    }

    switch (sortValue) {
      case "name_asc":
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        items.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "available_first":
        items.sort(
          (a, b) =>
            Number(
              b.status === "Available" ||
                b.status === "Open to Work" ||
                b.status === "Working" ||
                b.status === "Graduated"
            ) -
              Number(
                a.status === "Available" ||
                  a.status === "Open to Work" ||
                  a.status === "Working" ||
                  a.status === "Graduated"
              ) ||
            sortByName(a.name, b.name)
        );
        break;
      default:
        items.sort((a, b) => a.order - b.order || sortByName(a.name, b.name));
    }

    return items;
  }, [selectedPrimary, selectedSecondary, sortValue, source]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / DIRECTORY_PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * DIRECTORY_PAGE_SIZE;
    return filteredItems.slice(start, start + DIRECTORY_PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const rangeStart = filteredItems.length ? (currentPage - 1) * DIRECTORY_PAGE_SIZE + 1 : 0;
  const rangeEnd = filteredItems.length ? Math.min(currentPage * DIRECTORY_PAGE_SIZE, filteredItems.length) : 0;
  const gridColumnClass = mode === "team" ? "col-xl-6 col-lg-6 col-md-6" : "col-xl-4 col-md-6";
  const skeletonCount = mode === "team" ? 4 : isFeaturedHome ? featuredLimit : DIRECTORY_PAGE_SIZE;
  const visibleItems = isFeaturedHome ? filteredItems.slice(0, featuredLimit) : paginatedItems;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeStudentSlug = activeStudent?.publicSlug ? String(activeStudent.publicSlug) : "";
  const activeDetail = activeStudentSlug ? detailCache[activeStudentSlug] : undefined;

  useEffect(() => {
    if (!activeStudentSlug || detailCache[activeStudentSlug]) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    getPublicStudentBySlug(activeStudentSlug)
      .then((result) => {
        if (cancelled) return;
        setDetailCache((current) => ({ ...current, [activeStudentSlug]: result }));
      })
      .catch(() => {
        if (cancelled) return;
        setDetailError(profileErrorText);
      })
      .finally(() => {
        if (cancelled) return;
        setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeStudentSlug, detailCache, profileErrorText]);

  useEffect(() => {
    if (!activeStudent && !activeTeamMember) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveStudent(null);
        setActiveTeamMember(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activeStudent, activeTeamMember]);

  useEffect(() => {
    if (!activeTeamMember) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeTeamMember]);

  const modalName = activeDetail?.full_name || activeStudent?.name || "Participant";
  const modalBio = String(activeDetail?.bio || activeStudent?.bio || "").trim();
  const modalProgram = String(activeDetail?.program_title || activeStudent?.programTitle || "").trim();
  const modalSkills = useMemo(() => {
    const fromCard = activeStudent?.skills || [];
    const fromDetail = parseSkillList(activeDetail?.skills);
    return Array.from(new Set([...fromCard, ...fromDetail]));
  }, [activeStudent?.skills, activeDetail?.skills]);
  const modalLocation =
    buildLocation({
      location: activeDetail?.location ?? activeStudent?.location,
      city: activeDetail?.city,
      country: activeDetail?.country,
    }) || "";
  const modalEmail = String(activeDetail?.email || activeStudent?.email || "").trim();
  const modalPhone = String(activeDetail?.phone || activeStudent?.phone || "").trim();
  const modalExperience =
    String(activeDetail?.experience_summary || activeStudent?.experienceSummary || "").trim();
  const modalEducation = String(activeDetail?.education || activeStudent?.education || "").trim();
  const modalCertifications = String(activeDetail?.certifications || activeStudent?.certifications || "").trim();
  const modalLinkedin = String(activeDetail?.linkedin_url || activeStudent?.linkedinUrl || "").trim();
  const modalGithub = String(activeDetail?.github_url || activeStudent?.githubUrl || "").trim();
  const modalPortfolio = String(activeDetail?.portfolio_url || activeStudent?.portfolioUrl || "").trim();
  const modalCvUrl = resolveAssetUrl(activeDetail?.cv_url || activeStudent?.cvUrl);
  const modalCvFileName = buildDownloadName(modalName, activeDetail?.cv_file_name || activeStudent?.cvFileName);
  const modalCvUpdated = formatDate(activeDetail?.cv_updated_at || activeStudent?.cvUpdatedAt);
  const modalProjects = Array.isArray(activeDetail?.projects) ? activeDetail.projects : [];
  const modalPrograms = Array.from(
    new Set(
      normalizeCohorts(activeDetail?.cohorts || activeStudent?.cohorts)
        .map((entry) => String(entry.program_title || "").trim())
        .filter(Boolean)
        .concat(modalProgram ? [modalProgram] : [])
    )
  );
  const modalQuickFacts = [
    modalProgram ? { label: "Current Program", value: modalProgram, modifier: "program" } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; modifier: string }>;
  const modalAvatar = (() => {
    const fromDetail = String(activeDetail?.avatar_url || "").trim();
    if (fromDetail && !isPlaceholderParticipantAvatar(fromDetail)) {
      return resolveAssetUrl(fromDetail);
    }
    return activeStudent?.avatar || null;
  })();

  const handlePageClick = (event: { selected: number }) => {
    setCurrentPage(event.selected + 1);
  };

  const renderParticipantCard = (item: DirectoryItem, index: number) => {
    const topSkills = (item.skills || []).slice(0, 3);
    const showWorkBadge = item.status === "Open to Work" || item.status === "Working";
    return (
      <article
        className={`people-card people-card--participant ${isFeaturedHome ? "people-card--featured-home" : ""}`}
        data-aos="fade-up"
        data-aos-delay={(index % 3) * 100}
      >
        <div className="people-card__head people-card__head--participant">
          <button
            type="button"
            className="people-card__avatar-btn"
            onClick={() => setActiveStudent(item)}
            aria-label={`View ${item.name} profile`}
          >
            <div className="people-card__avatar">
              {item.avatar ? (
                <Image src={item.avatar} alt={item.name} />
              ) : (
                <span className="people-card__avatar-fallback" aria-hidden="true">
                  {toInitials(item.name)}
                </span>
              )}
            </div>
          </button>

          <div className="people-card__identity">
            <button
              type="button"
              className="people-card__name-btn people-card__name-btn--inline"
              onClick={() => setActiveStudent(item)}
            >
              <h4 className="people-card__name">{item.name}</h4>
            </button>
            {showWorkBadge ? (
              <span className={`people-card__status people-card__status--stacked ${statusClassName(item.status)}`}>{item.status}</span>
            ) : null}
          </div>
        </div>

        {item.bio && <p className="people-card__bio">{item.bio}</p>}

        <div className="people-card__tags">
          {topSkills.length > 0
            ? topSkills.map((skill) => <span key={`${item.id}-${skill}`}>{skill}</span>)
            : <span>{item.secondaryTag}</span>}
        </div>
      </article>
    );
  };

  return (
    <>
      {isFeaturedHome ? (
        <section className="featured-participants-home section-py-120">
          <div className="container">
            <div className="section__title text-center mb-40">
              <span className="sub-title">{featuredSectionEyebrow}</span>
              <h2 className="title">{featuredSectionTitle}</h2>
              <p>{featuredSectionBody}</p>
            </div>
            <div className="row g-4 justify-content-center">
              {loading
                ? Array.from({ length: featuredLimit }).map((_, index) => (
                    <div key={`featured-people-skeleton-${index}`} className="col-xl-4 col-md-6">
                      <article className="people-card people-card--participant people-card--featured-home people-card--skeleton" aria-hidden="true">
                        <div className="people-card__head people-card__head--participant">
                          <div className="people-card__media">
                            <div className="people-card__avatar people-card__skeleton-block" />
                            <span className="people-card__skeleton-pill people-card__skeleton-block" />
                          </div>
                          <div className="people-card__identity">
                            <div className="people-card__skeleton-line people-card__skeleton-line--title people-card__skeleton-block" />
                            <div className="people-card__skeleton-line people-card__skeleton-line--role people-card__skeleton-block" />
                            <div className="people-card__skeleton-line people-card__skeleton-line--bio people-card__skeleton-block" />
                          </div>
                        </div>
                        <div className="people-card__skeleton-line people-card__skeleton-line--bio people-card__skeleton-block" />
                        <div className="people-card__tags">
                          <span className="people-card__skeleton-tag people-card__skeleton-block" />
                          <span className="people-card__skeleton-tag people-card__skeleton-block" />
                        </div>
                      </article>
                    </div>
                  ))
                : visibleItems.map((item, index) => (
                    <div key={item.id} className="col-xl-4 col-md-6">
                      {renderParticipantCard(item, index)}
                    </div>
                  ))}

              {!loading && visibleItems.length === 0 && (
                <div className="col-12">
                  <p className="people-empty">{error || emptyStateText}</p>
                </div>
              )}
            </div>
            <div className="featured-participants-home__cta">
              <Link to={featuredSectionCtaLink} className="btn arrow-btn">
                {featuredSectionCta}
                <BtnArrow />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className={`people-directory section-py-120 people-directory--${mode}`}>
          <div className="container">
            <div className="row">
              <div className="col-xl-3 col-lg-4">
                <aside className="people-filters">
                  <div className="people-filters__card">
                    <h4 className="people-filters__title">{primaryFilterTitle}</h4>
                    <ul className="people-filters__list list-wrap">
                      <li>
                        <label className="people-filter-check">
                          <input
                            type="checkbox"
                            checked={selectedPrimary.length === 0}
                            onChange={() => {
                              setSelectedPrimary([]);
                              setCurrentPage(1);
                            }}
                          />
                          <span>{primaryFilterTitle}</span>
                        </label>
                      </li>
                      {primaryOptions.map((item) => (
                        <li key={item}>
                          <label className="people-filter-check">
                            <input
                              type="checkbox"
                              checked={selectedPrimary.includes(item)}
                              onChange={() => toggleMulti(item, setSelectedPrimary)}
                            />
                            <span>{item}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="people-filters__card">
                    <h4 className="people-filters__title">{secondaryFilterTitle}</h4>
                    <ul className="people-filters__list list-wrap">
                      <li>
                        <label className="people-filter-check">
                          <input
                            type="checkbox"
                            checked={selectedSecondary.length === 0}
                            onChange={() => {
                              setSelectedSecondary([]);
                              setCurrentPage(1);
                            }}
                          />
                          <span>{secondaryFilterTitle}</span>
                        </label>
                      </li>
                      {secondaryOptions.map((item) => (
                        <li key={item}>
                          <label className="people-filter-check">
                            <input
                              type="checkbox"
                              checked={selectedSecondary.includes(item)}
                              onChange={() => toggleMulti(item, setSelectedSecondary)}
                            />
                            <span>{item}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>

              <div className="col-xl-9 col-lg-8">
                <div className="people-toolbar">
                  <p className="people-toolbar__count">
                    {loading
                      ? loadingProfilesText
                      : applyTemplate(showingResultsTemplate, {
                          start: rangeStart,
                          end: rangeEnd,
                          total: filteredItems.length,
                        })}
                  </p>

                  <div className="people-toolbar__sort">
                    <span>{sortLabel}</span>
                    <select
                      value={sortValue}
                      onChange={(event) => {
                        setSortValue(event.target.value as DirectorySortValue);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="default">{sortDefaultLabel}</option>
                      <option value="available_first">{sortAvailabilityLabel}</option>
                      <option value="name_asc">{sortNameAscLabel}</option>
                      <option value="name_desc">{sortNameDescLabel}</option>
                    </select>
                  </div>
                </div>

                <div className="row g-4">
                  {loading
                    ? Array.from({ length: skeletonCount }).map((_, index) => (
                        <div key={`people-skeleton-${index}`} className={gridColumnClass}>
                          {mode === "team" ? (
                            <article className="instructor__item people-team-card--skeleton" aria-hidden="true">
                              <div className="instructor__thumb">
                                <span className="people-team-card__avatar-skeleton people-card__skeleton-block" />
                              </div>
                              <div className="instructor__content">
                                <span className="people-team-card__line people-team-card__line--title people-card__skeleton-block" />
                                <span className="people-team-card__line people-team-card__line--role people-card__skeleton-block" />
                                <span className="people-team-card__line people-team-card__line--role people-card__skeleton-block" />
                                <div className="people-team-card__social-skeleton">
                                  <span className="people-team-card__icon-skeleton people-card__skeleton-block" />
                                  <span className="people-team-card__icon-skeleton people-card__skeleton-block" />
                                  <span className="people-team-card__icon-skeleton people-card__skeleton-block" />
                                </div>
                              </div>
                            </article>
                          ) : (
                            <article className="people-card people-card--participant people-card--skeleton" aria-hidden="true">
                              <div className="people-card__head people-card__head--participant">
                                <div className="people-card__media">
                                  <div className="people-card__avatar people-card__skeleton-block" />
                                  <span className="people-card__skeleton-pill people-card__skeleton-block" />
                                </div>
                                <div className="people-card__identity">
                                  <div className="people-card__skeleton-line people-card__skeleton-line--title people-card__skeleton-block" />
                                  <div className="people-card__skeleton-line people-card__skeleton-line--role people-card__skeleton-block" />
                                  <div className="people-card__skeleton-line people-card__skeleton-line--bio people-card__skeleton-block" />
                                </div>
                              </div>
                              <div className="people-card__skeleton-line people-card__skeleton-line--bio people-card__skeleton-block" />
                              <div className="people-card__tags">
                                <span className="people-card__skeleton-tag people-card__skeleton-block" />
                                <span className="people-card__skeleton-tag people-card__skeleton-block" />
                              </div>
                            </article>
                          )}
                        </div>
                      ))
                    : visibleItems.map((item, index) => {
                        const teamSocialItems = [
                          {
                            key: 'linkedin',
                            label: 'LinkedIn',
                            iconClass: 'fab fa-linkedin-in',
                            url: normalizeExternalUrl(item.linkedinUrl),
                          },
                          {
                            key: 'github',
                            label: 'GitHub',
                            iconClass: 'fab fa-github',
                            url: normalizeExternalUrl(item.githubUrl),
                          },
                          {
                            key: 'portfolio',
                            label: 'Portfolio',
                            iconClass: 'fas fa-link',
                            url: normalizeExternalUrl(item.portfolioUrl),
                          },
                        ].filter((entry) => Boolean(entry.url));

                        return (
                          <div key={item.id} className={gridColumnClass}>
                            {mode === 'team' ? (
                              <article className="instructor__item" data-aos="fade-up" data-aos-delay={(index % 3) * 100}>
                                <div className="instructor__thumb">
                                  <button
                                    type="button"
                                    className="dh-instructor-card__avatar-button"
                                    onClick={() => setActiveTeamMember(item)}
                                    aria-label={`View ${item.name} profile`}
                                  >
                                    <div className="dh-instructor-card__avatar-wrap">
                                      {item.avatar ? (
                                        <Image className="dh-instructor-card__avatar-image" src={item.avatar} alt={item.name} />
                                      ) : (
                                        <span className="dh-instructor-card__avatar-fallback" aria-hidden="true">
                                          {toInitials(item.name)}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                </div>
                                <div className="instructor__content">
                                  <h2 className="title">
                                    <button type="button" className="dh-instructor-card__name-btn" onClick={() => setActiveTeamMember(item)}>
                                      {item.name}
                                    </button>
                                  </h2>
                                  <span className="designation">{item.role}</span>
                                  {teamSocialItems.length ? (
                                    <div className="instructor__social">
                                      <ul className="list-wrap dh-instructor-card__social-list">
                                        {teamSocialItems.map((social) => (
                                          <li key={`${item.id}-${social.key}`} className={`dh-instructor-card__social-item dh-instructor-card__social-item--${social.key}`}>
                                            <a href={social.url} target="_blank" rel="noreferrer" aria-label={social.label}>
                                              <i className={social.iconClass}></i>
                                            </a>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}
                                </div>
                              </article>
                            ) : (
                              renderParticipantCard(item, index)
                            )}
                          </div>
                        );
                      })}

                  {!loading && filteredItems.length === 0 && (
                    <div className="col-12">
                      <p className="people-empty">{error || emptyStateText}</p>
                    </div>
                  )}
                </div>

                {!loading && filteredItems.length > DIRECTORY_PAGE_SIZE && (
                  <nav className="pagination__wrap mt-30" aria-label="Participants pagination">
                    <ReactPaginate
                      breakLabel="..."
                      onPageChange={handlePageClick}
                      pageRangeDisplayed={3}
                      pageCount={totalPages}
                      forcePage={Math.max(0, currentPage - 1)}
                      className="list-wrap"
                      previousLabel={
                        <i
                          className="flaticon-arrow-right"
                          style={{ transform: 'rotate(180deg)', display: 'inline-block' }}
                        ></i>
                      }
                      nextLabel={<i className="flaticon-arrow-right"></i>}
                      previousAriaLabel="Previous page"
                      nextAriaLabel="Next page"
                      previousClassName="previous pagination__arrow"
                      nextClassName="next pagination__arrow"
                    />
                  </nav>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      {mode === "participants" && activeStudent && (
        <div className="people-modal" role="dialog" aria-modal="true" onClick={() => setActiveStudent(null)}>
          <div className="people-modal__dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="people-modal__close" onClick={() => setActiveStudent(null)} aria-label={closeProfileLabel}>
              <i className="fas fa-times" />
            </button>

            <div className="people-modal__hero">
              <div className="people-modal__head">
                <div className="people-modal__avatar people-modal__avatar--participant">
                  {modalAvatar ? (
                    <Image src={modalAvatar} alt={modalName} />
                  ) : (
                    <span className="people-modal__avatar-fallback" aria-hidden="true">
                      {toInitials(modalName)}
                    </span>
                  )}
                </div>
                <div className="people-modal__identity">
                  <h3>{modalName}</h3>
                  <p>Participant</p>
                </div>
              </div>

              <div className="people-modal__hero-side">
                {(modalLinkedin || modalGithub || modalPortfolio) && (
                  <div className="people-modal__socials">
                    {modalLinkedin && (
                      <a href={normalizeExternalUrl(modalLinkedin)} target="_blank" rel="noreferrer" aria-label="LinkedIn profile">
                        <i className="fab fa-linkedin-in" />
                      </a>
                    )}
                    {modalGithub && (
                      <a href={normalizeExternalUrl(modalGithub)} target="_blank" rel="noreferrer" aria-label="GitHub profile">
                        <i className="fab fa-github" />
                      </a>
                    )}
                    {modalPortfolio && (
                      <a href={normalizeExternalUrl(modalPortfolio)} target="_blank" rel="noreferrer" aria-label="Portfolio link">
                        <i className="fas fa-link" />
                      </a>
                    )}
                  </div>
                )}
                {(modalLocation || modalEmail || modalPhone) && (
                  <div className="people-modal__contact-list">
                    {modalLocation && <span><i className="fas fa-location-dot" />{modalLocation}</span>}
                    {modalEmail && <span><i className="fas fa-envelope" />{modalEmail}</span>}
                    {modalPhone && <span><i className="fas fa-phone" />{modalPhone}</span>}
                  </div>
                )}
              </div>
            </div>

            {detailLoading && !activeDetail && <p className="people-modal__loading">{profileLoadingText}</p>}
            {detailError && !activeDetail && <p className="people-modal__error">{detailError}</p>}

            {!detailLoading && (
              <div className="people-modal__body">
                {modalQuickFacts.length > 0 && (
                  <section className="people-modal__panel people-modal__panel--wide people-modal__panel--summary">
                    <h4>Snapshot</h4>
                    <div className="people-modal__summary-grid">
                      {modalQuickFacts.map((item) => (
                        <div key={`participant-summary-${item.label}`} className={`people-modal__summary-card people-modal__summary-card--${item.modifier}`}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {modalBio && (
                  <section className="people-modal__panel people-modal__panel--wide">
                    <h4>{aboutTitle}</h4>
                    <p>{modalBio}</p>
                  </section>
                )}

                {modalSkills.length > 0 && (
                  <section className="people-modal__panel people-modal__panel--wide">
                    <h4>{skillsTitle}</h4>
                    <div className="people-modal__chips">
                      {modalSkills.map((skill) => (
                        <span key={`modal-skill-${skill}`}>{skill}</span>
                      ))}
                    </div>
                  </section>
                )}

                {modalProjects.length > 0 && (
                  <section className="people-modal__panel people-modal__panel--wide">
                    <h4>{projectsTitle}</h4>
                    <div className="people-modal__projects">
                      {modalProjects.map((project) => (
                        <article key={project.id} className="people-modal__project-card">
                          <h5>{project.title}</h5>
                          {project.description && <p>{project.description}</p>}
                          <div className="people-modal__project-links">
                            {project.github_url && (
                              <a href={normalizeExternalUrl(project.github_url)} target="_blank" rel="noreferrer">
                                {repoText}
                              </a>
                            )}
                            {project.live_url && (
                              <a href={normalizeExternalUrl(project.live_url)} target="_blank" rel="noreferrer">
                                {demoText}
                              </a>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {modalExperience && (
                  <section className="people-modal__panel">
                    <h4>{experienceTitle}</h4>
                    <p>{modalExperience}</p>
                  </section>
                )}

                {modalEducation && (
                  <section className="people-modal__panel">
                    <h4>{educationTitle}</h4>
                    <p>{modalEducation}</p>
                  </section>
                )}

                {modalCertifications && (
                  <section className="people-modal__panel">
                    <h4>{certificationsTitle}</h4>
                    <p>{modalCertifications}</p>
                  </section>
                )}

                {modalPrograms.length > 0 && (
                  <section className="people-modal__panel people-modal__panel--wide">
                    <h4>{programsTitle}</h4>
                    <div className="people-modal__chips">
                      {modalPrograms.map((label, index) => <span key={`modal-program-${index}`}>{label}</span>)}
                    </div>
                  </section>
                )}

                <section className="people-modal__panel">
                  <h4>{cvTitle}</h4>
                  {!modalCvUrl && <p>{cvMissingText}</p>}
                  {modalCvUpdated && <small>{cvUpdatedLabel}: {modalCvUpdated}</small>}
                  <div className="people-modal__cv-actions">
                    {modalCvUrl ? (
                      <>
                        <a href={modalCvUrl} target="_blank" rel="noreferrer" className="people-modal__action-btn people-modal__action-btn--ghost">
                          {viewCvText}
                        </a>
                        <a href={modalCvUrl} download={modalCvFileName} className="people-modal__action-btn people-modal__action-btn--ghost">
                          {downloadCvText}
                        </a>
                      </>
                    ) : (
                      <>
                        <button type="button" className="people-modal__action-btn people-modal__action-btn--ghost is-disabled" disabled>
                          {viewCvText}
                        </button>
                        <button type="button" className="people-modal__action-btn people-modal__action-btn--ghost is-disabled" disabled>
                          {downloadCvText}
                        </button>
                      </>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}      {mode === "team" && activeTeamMember && (
        <div className="dh-team-modal" role="dialog" aria-modal="true" onClick={() => setActiveTeamMember(null)}>
          <div className="dh-team-modal__dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="dh-team-modal__close" onClick={() => setActiveTeamMember(null)} aria-label={closeModalLabel}>
              <i className="fas fa-times" />
            </button>
            <div className="dh-team-modal__head">
              <div className="dh-team-modal__avatar">
                {activeTeamMember.avatar ? (
                  <Image className="dh-team-modal__avatar-image" src={activeTeamMember.avatar} alt={activeTeamMember.name} />
                ) : (
                  <span className="dh-team-modal__avatar-fallback" aria-hidden="true">
                    {toInitials(activeTeamMember.name)}
                  </span>
                )}
              </div>
              <div className="dh-team-modal__identity">
                <h3>{activeTeamMember.name}</h3>
                <p>{activeTeamMember.role}</p>
              </div>
            </div>
            {activeTeamMember.bio ? <p className="dh-team-modal__bio">{activeTeamMember.bio}</p> : null}
            {(activeTeamMember.skills || []).length ? (
              <div className="dh-team-modal__skills">
                {(activeTeamMember.skills || []).slice(0, 10).map((skill) => (
                  <span key={`team-modal-skill-${activeTeamMember.id}-${skill}`}>{skill}</span>
                ))}
              </div>
            ) : null}
            {(() => {
              const socials = [
                { key: "linkedin", label: "LinkedIn", iconClass: "fab fa-linkedin-in", url: normalizeExternalUrl(activeTeamMember.linkedinUrl) },
                { key: "github", label: "GitHub", iconClass: "fab fa-github", url: normalizeExternalUrl(activeTeamMember.githubUrl) },
                { key: "portfolio", label: "Portfolio", iconClass: "fas fa-link", url: normalizeExternalUrl(activeTeamMember.portfolioUrl) },
              ].filter((entry) => Boolean(entry.url));
              if (!socials.length) return null;
              return (
                <ul className="list-wrap dh-team-modal__social-list">
                  {socials.map((social) => (
                    <li key={`team-modal-social-${social.key}`} className={`dh-instructor-card__social-item dh-instructor-card__social-item--${social.key}`}>
                      <a href={social.url} target="_blank" rel="noreferrer" aria-label={social.label}>
                        <i className={social.iconClass}></i>
                      </a>
                    </li>
                  ))}
                </ul>
              );
            })()}
            <div className="dh-team-modal__actions">
              <Link to="/contact" className="btn arrow-btn dh-team-modal__contact-btn">
                {contactCtaText}
                <BtnArrow />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PeopleDirectory;


