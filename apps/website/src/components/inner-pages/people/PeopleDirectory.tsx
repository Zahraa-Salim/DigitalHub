"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import {
  API_BASE_URL,
  getPublicStudentBySlug,
  listPublicInstructors,
  listPublicManagers,
  listPublicStudents,
  type PublicStudent,
  type PublicStudentDetail,
} from "@/lib/publicApi";
import type { PeopleMode } from "@/data/mock/peopleDirectoryData";
import ReactPaginate from "react-paginate";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";

type PeopleDirectoryProps = {
  mode: PeopleMode;
};

type DirectoryItem = {
  id: number;
  name: string;
  role: string;
  primaryTag: string;
  secondaryTag: string;
  status: string;
  bio: string;
  avatar: string;
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

const modeText = {
  participants: {
    allPrimary: "All Status",
    allSecondary: "All Tracks",
    cta: "Contact",
  },
  team: {
    allPrimary: "All Roles",
    allSecondary: "All Expertise",
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

const PeopleDirectory = ({ mode }: PeopleDirectoryProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [source, setSource] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrimary, setSelectedPrimary] = useState<string[]>([]);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState<DirectorySortValue>("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStudent, setActiveStudent] = useState<DirectoryItem | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, PublicStudentDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        if (mode === "participants") {
          const students: PublicStudent[] = [];
          for (let page = 1; page <= MAX_STUDENT_FETCH_PAGES; page += 1) {
            const chunk = await listPublicStudents({ page, limit: STUDENTS_FETCH_LIMIT });
            students.push(...chunk);
            if (chunk.length < STUDENTS_FETCH_LIMIT) break;
          }

          const rows: DirectoryItem[] = students.map((student, index) => {
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
            const secondaryTag = programTitle || cohortName || "Digital Hub";
            const headline =
              String(student.headline || "").trim() ||
              (student.is_working
                ? "Working Participant"
                : student.is_graduated
                  ? "Graduate Participant"
                  : "Participant");

            return {
              id: student.user_id,
              name: student.full_name || "Participant",
              role: headline,
              primaryTag: status,
              secondaryTag,
              status,
              bio: student.bio || "",
              avatar: resolveAvatar(student.avatar_url, "/assets/img/instructor/instructor01.png"),
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
          });

          if (!active) return;
          setSource(rows.sort((a, b) => a.order - b.order || sortByName(a.name, b.name)));
          setError(null);
          return;
        }

        const [admins, instructors] = await Promise.all([listPublicManagers(), listPublicInstructors()]);

        const adminRows: DirectoryItem[] = admins.map((admin) => ({
          id: admin.user_id,
          name: admin.full_name,
          role: admin.job_title || "Admin Team",
          primaryTag: "Admin Team",
          secondaryTag: admin.admin_role === "super_admin" ? "Super Admin" : "Admin",
          status: "Available",
          bio: admin.bio || "Admin profile.",
          avatar: resolveAvatar(admin.avatar_url, "/assets/img/instructor/instructor08.png"),
          order: admin.sort_order ?? 0,
        }));

        const instructorRows: DirectoryItem[] = instructors.map((instructor, index) => ({
          id: instructor.user_id,
          name: instructor.full_name,
          role: "Instructor",
          primaryTag: "Instructors",
          secondaryTag: instructor.expertise || "Mentorship",
          status: "Available",
          bio: instructor.bio || "Instructor profile.",
          avatar: resolveAvatar(instructor.avatar_url, "/assets/img/instructor/instructor07.png"),
          order: 1000 + index,
        }));

        if (!active) return;
        setSource([...adminRows, ...instructorRows].sort((a, b) => a.order - b.order || sortByName(a.name, b.name)));
        setError(null);
      } catch {
        if (!active) return;
        setSource([]);
        setError("Unable to load profiles right now.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "participants") return;

    const sortFromQuery = searchParams.get("sort");
    const parsedSort: DirectorySortValue = DIRECTORY_SORT_VALUES.includes(sortFromQuery as DirectorySortValue)
      ? (sortFromQuery as DirectorySortValue)
      : "default";
    const statusFromQuery = parseCsvQueryParam(searchParams.get("status"));
    const trackFromQuery = parseCsvQueryParam(searchParams.get("track"));
    const pageFromQuery = Number.parseInt(searchParams.get("page") || "1", 10);
    const parsedPage = Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1;

    setSortValue((current) => (current === parsedSort ? current : parsedSort));
    setCurrentPage((current) => (current === parsedPage ? current : parsedPage));
    setSelectedPrimary((current) => (arraysEqual(current, statusFromQuery) ? current : statusFromQuery));
    setSelectedSecondary((current) => (arraysEqual(current, trackFromQuery) ? current : trackFromQuery));
  }, [mode, searchParams]);

  useEffect(() => {
    if (mode === "participants") return;
    setSelectedPrimary([]);
    setSelectedSecondary([]);
    setSortValue("default");
    setCurrentPage(1);
  }, [mode]);

  const primaryOptions = useMemo(
    () => Array.from(new Set(source.map((item) => item.primaryTag))).sort(sortByName),
    [source]
  );

  const secondaryOptions = useMemo(
    () => Array.from(new Set(source.map((item) => item.secondaryTag))).sort(sortByName),
    [source]
  );

  useEffect(() => {
    if (mode !== "participants" || loading) return;

    setSelectedPrimary((current) => {
      const next = current.filter((item) => primaryOptions.includes(item));
      return arraysEqual(current, next) ? current : next;
    });
    setSelectedSecondary((current) => {
      const next = current.filter((item) => secondaryOptions.includes(item));
      return arraysEqual(current, next) ? current : next;
    });
  }, [mode, loading, primaryOptions, secondaryOptions]);

  useEffect(() => {
    if (mode !== "participants") return;

    const next = new URLSearchParams();
    if (selectedPrimary.length) next.set("status", selectedPrimary.join(","));
    if (selectedSecondary.length) next.set("track", selectedSecondary.join(","));
    if (sortValue !== "default") next.set("sort", sortValue);
    if (currentPage > 1) next.set("page", String(currentPage));

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [mode, selectedPrimary, selectedSecondary, sortValue, currentPage, searchParams, setSearchParams]);

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
        setDetailError("Unable to load full profile right now.");
      })
      .finally(() => {
        if (cancelled) return;
        setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeStudentSlug, detailCache]);

  useEffect(() => {
    if (!activeStudent) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveStudent(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activeStudent]);

  const modalName = activeDetail?.full_name || activeStudent?.name || "Participant";
  const modalStatus = activeStudent?.status || (activeDetail ? resolveStudentStatus(activeDetail) : "Participant");
  const modalHeadline =
    String(activeDetail?.headline || "").trim() ||
    String(activeStudent?.headline || "").trim() ||
    String(activeStudent?.role || "").trim() ||
    "Participant";
  const modalTrackLine = [
    String(activeDetail?.program_title || "").trim() || String(activeStudent?.programTitle || "").trim(),
    String(activeDetail?.cohort_name || "").trim() || String(activeStudent?.cohortName || "").trim(),
  ]
    .filter(Boolean)
    .join(" - ");
  const modalBio = String(activeDetail?.bio || activeStudent?.bio || "").trim();
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
  const modalCohorts = normalizeCohorts(activeDetail?.cohorts || activeStudent?.cohorts);

  const handlePageClick = (event: { selected: number }) => {
    setCurrentPage(event.selected + 1);
  };

  return (
    <>
      <section className="people-directory section-py-120">
        <div className="container">
          <div className="row">
            <div className="col-xl-3 col-lg-4">
              <aside className="people-filters">
              <div className="people-filters__card">
                <h4 className="people-filters__title">{modeText[mode].allPrimary}</h4>
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
                      <span>{modeText[mode].allPrimary}</span>
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
                <h4 className="people-filters__title">{modeText[mode].allSecondary}</h4>
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
                      <span>{modeText[mode].allSecondary}</span>
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
                {loading ? "Loading profiles..." : `Showing ${rangeStart}-${rangeEnd} of ${filteredItems.length}`}
              </p>

              <div className="people-toolbar__sort">
                <span>Sort By:</span>
                <select
                  value={sortValue}
                  onChange={(event) => {
                    setSortValue(event.target.value as DirectorySortValue);
                    setCurrentPage(1);
                  }}
                >
                  <option value="default">Default</option>
                  <option value="available_first">Availability</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                </select>
              </div>
              </div>

              <div className="row g-4">
              {loading
                ? Array.from({ length: DIRECTORY_PAGE_SIZE }).map((_, index) => (
                    <div key={`people-skeleton-${index}`} className="col-xl-4 col-md-6">
                      <article className="people-card people-card--skeleton" aria-hidden="true">
                        <div className="people-card__head">
                          <div className="people-card__avatar people-card__skeleton-block" />
                          <span className="people-card__skeleton-pill people-card__skeleton-block" />
                        </div>
                        <div className="people-card__skeleton-line people-card__skeleton-line--title people-card__skeleton-block" />
                        <div className="people-card__skeleton-line people-card__skeleton-line--role people-card__skeleton-block" />
                        <div className="people-card__skeleton-line people-card__skeleton-line--bio people-card__skeleton-block" />
                        <div className="people-card__skeleton-line people-card__skeleton-line--bio people-card__skeleton-block" />
                        <div className="people-card__tags">
                          <span className="people-card__skeleton-tag people-card__skeleton-block" />
                          <span className="people-card__skeleton-tag people-card__skeleton-block" />
                        </div>
                        <div className="people-card__skeleton-cta people-card__skeleton-block" />
                      </article>
                    </div>
                  ))
                : paginatedItems.map((item, index) => {
                    const topSkills = (item.skills || []).slice(0, 3);
                    const cvUrl = resolveAssetUrl(item.cvUrl);
                    const hasCv = Boolean(cvUrl);
                    return (
                      <div key={item.id} className="col-xl-4 col-md-6">
                        <article
                          className={`people-card ${mode === "participants" ? "people-card--participant" : ""}`}
                          data-aos="fade-up"
                          data-aos-delay={(index % 3) * 100}
                        >
                          <div className="people-card__head">
                            <div className="people-card__avatar">
                              <Image src={item.avatar} alt={item.name} />
                            </div>
                            <span className={`people-card__status ${statusClassName(item.status)}`}>{item.status}</span>
                          </div>

                          <h4 className="people-card__name">{item.name}</h4>
                          <p className="people-card__role">{mode === "participants" ? item.headline || item.role : item.role}</p>

                          {mode === "participants" && (
                            <p className="people-card__meta-line">
                              {[item.programTitle, item.cohortName].filter(Boolean).join(" - ") || item.secondaryTag}
                            </p>
                          )}

                          {mode === "participants" && item.location && (
                            <p className="people-card__meta-line people-card__meta-line--muted">{item.location}</p>
                          )}

                          {item.bio && <p className="people-card__bio">{item.bio}</p>}

                          <div className="people-card__tags">
                            {mode === "participants" && topSkills.length > 0
                              ? topSkills.map((skill) => <span key={`${item.id}-${skill}`}>{skill}</span>)
                              : (
                                  <>
                                    <span>{item.primaryTag}</span>
                                    <span>{item.secondaryTag}</span>
                                  </>
                                )}
                          </div>

                          {mode === "participants" ? (
                            <div className="people-card__actions">
                              <button type="button" className="people-card__cta" onClick={() => setActiveStudent(item)}>
                                View Profile
                              </button>
                              {hasCv ? (
                                <>
                                  <a href={cvUrl} target="_blank" rel="noreferrer" className="people-card__cta people-card__cta--secondary">
                                    View CV
                                  </a>
                                  <a
                                    href={cvUrl}
                                    download={buildDownloadName(item.name, item.cvFileName)}
                                    className="people-card__cta people-card__cta--secondary"
                                  >
                                    Download CV
                                  </a>
                                </>
                              ) : (
                                <>
                                  <button type="button" className="people-card__cta people-card__cta--secondary is-disabled" disabled>
                                    View CV
                                  </button>
                                  <button type="button" className="people-card__cta people-card__cta--secondary is-disabled" disabled>
                                    Download CV
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <Link to="/contact" className="people-card__cta">
                              {modeText[mode].cta}
                            </Link>
                          )}
                        </article>
                      </div>
                    );
                  })}

              {!loading && filteredItems.length === 0 && (
                <div className="col-12">
                  <p className="people-empty">{error || "No records match your selected filters."}</p>
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
                        style={{ transform: "rotate(180deg)", display: "inline-block" }}
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

      {mode === "participants" && activeStudent && (
        <div className="people-modal" role="dialog" aria-modal="true" onClick={() => setActiveStudent(null)}>
          <div className="people-modal__dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="people-modal__close" onClick={() => setActiveStudent(null)} aria-label="Close profile">
              x
            </button>

            <div className="people-modal__head">
              <div className="people-modal__avatar">
                <Image src={activeStudent.avatar} alt={modalName} />
              </div>
              <div>
                <h3>{modalName}</h3>
                <p>{modalHeadline}</p>
                {modalTrackLine && <small>{modalTrackLine}</small>}
                <span className={`people-card__status ${statusClassName(modalStatus)} people-modal__status`}>{modalStatus}</span>
              </div>
            </div>

            {detailLoading && !activeDetail && <p className="people-modal__loading">Loading profile details...</p>}
            {detailError && !activeDetail && <p className="people-modal__error">{detailError}</p>}

            {!detailLoading && (
              <div className="people-modal__body">
                {modalBio && (
                  <section>
                    <h4>About</h4>
                    <p>{modalBio}</p>
                  </section>
                )}

                {modalSkills.length > 0 && (
                  <section>
                    <h4>Skills</h4>
                    <div className="people-modal__chips">
                      {modalSkills.map((skill) => (
                        <span key={`modal-skill-${skill}`}>{skill}</span>
                      ))}
                    </div>
                  </section>
                )}

                {modalProjects.length > 0 && (
                  <section>
                    <h4>Projects</h4>
                    <div className="people-modal__projects">
                      {modalProjects.map((project) => (
                        <article key={project.id} className="people-modal__project-card">
                          <h5>{project.title}</h5>
                          {project.description && <p>{project.description}</p>}
                          <div className="people-modal__project-links">
                            {project.github_url && (
                              <a href={project.github_url} target="_blank" rel="noreferrer">
                                Repo
                              </a>
                            )}
                            {project.live_url && (
                              <a href={project.live_url} target="_blank" rel="noreferrer">
                                Demo
                              </a>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {modalExperience && (
                  <section>
                    <h4>Experience</h4>
                    <p>{modalExperience}</p>
                  </section>
                )}

                {(modalEducation || modalCertifications) && (
                  <section className="people-modal__grid">
                    {modalEducation && (
                      <div>
                        <h4>Education</h4>
                        <p>{modalEducation}</p>
                      </div>
                    )}
                    {modalCertifications && (
                      <div>
                        <h4>Certifications</h4>
                        <p>{modalCertifications}</p>
                      </div>
                    )}
                  </section>
                )}

                {modalCohorts.length > 0 && (
                  <section>
                    <h4>Cohorts</h4>
                    <div className="people-modal__chips">
                      {modalCohorts.map((entry, index) => {
                        const label = [entry.program_title, entry.cohort_name].filter(Boolean).join(" - ");
                        if (!label) return null;
                        return <span key={`modal-cohort-${index}`}>{label}</span>;
                      })}
                    </div>
                  </section>
                )}

                {(modalLinkedin || modalGithub || modalPortfolio) && (
                  <section>
                    <h4>Links</h4>
                    <div className="people-modal__links">
                      {modalLinkedin && (
                        <a href={modalLinkedin} target="_blank" rel="noreferrer">
                          LinkedIn
                        </a>
                      )}
                      {modalGithub && (
                        <a href={modalGithub} target="_blank" rel="noreferrer">
                          GitHub
                        </a>
                      )}
                      {modalPortfolio && (
                        <a href={modalPortfolio} target="_blank" rel="noreferrer">
                          Portfolio
                        </a>
                      )}
                    </div>
                  </section>
                )}

                {(modalLocation || modalEmail || modalPhone) && (
                  <section className="people-modal__grid">
                    {modalLocation && (
                      <div>
                        <h4>Location</h4>
                        <p>{modalLocation}</p>
                      </div>
                    )}
                    {modalEmail && (
                      <div>
                        <h4>Email</h4>
                        <p>{modalEmail}</p>
                      </div>
                    )}
                    {modalPhone && (
                      <div>
                        <h4>Phone</h4>
                        <p>{modalPhone}</p>
                      </div>
                    )}
                  </section>
                )}

                <section className="people-modal__cv">
                  <h4>CV</h4>
                  {!modalCvUrl && <p>CV not uploaded yet.</p>}
                  {modalCvUpdated && <small>Updated: {modalCvUpdated}</small>}
                  <div className="people-modal__cv-actions">
                    {modalCvUrl ? (
                      <>
                        <a href={modalCvUrl} target="_blank" rel="noreferrer" className="people-card__cta people-card__cta--secondary">
                          View CV
                        </a>
                        <a href={modalCvUrl} download={modalCvFileName} className="people-card__cta people-card__cta--secondary">
                          Download CV
                        </a>
                      </>
                    ) : (
                      <>
                        <button type="button" className="people-card__cta people-card__cta--secondary is-disabled" disabled>
                          View CV
                        </button>
                        <button type="button" className="people-card__cta people-card__cta--secondary is-disabled" disabled>
                          Download CV
                        </button>
                      </>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PeopleDirectory;
