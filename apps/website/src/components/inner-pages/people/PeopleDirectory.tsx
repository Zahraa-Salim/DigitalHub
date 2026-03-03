"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { API_BASE_URL, listPublicInstructors, listPublicManagers, listPublicStudents } from "@/lib/publicApi";
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

const PeopleDirectory = ({ mode }: PeopleDirectoryProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [source, setSource] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrimary, setSelectedPrimary] = useState<string[]>([]);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState<DirectorySortValue>("default");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        if (mode === "participants") {
          const students = [];
          for (let page = 1; page <= MAX_STUDENT_FETCH_PAGES; page += 1) {
            const chunk = await listPublicStudents({ page, limit: STUDENTS_FETCH_LIMIT });
            students.push(...chunk);
            if (chunk.length < STUDENTS_FETCH_LIMIT) break;
          }

          const rows: DirectoryItem[] = students.map((student, index) => {
            // Status mapping reflects student_profiles booleans from backend.
            const hasOpenToWork = Boolean(student.open_to_work);
            const hasWorking = Boolean(student.is_working);
            const hasGraduated = Boolean(student.is_graduated);
            let status = "Participant";
            if (hasWorking) status = "Working";
            else if (hasGraduated) status = "Graduated";
            if (hasOpenToWork) status = "Open to Work";

            return {
              id: student.user_id,
              name: student.full_name || "Participant",
              role: hasGraduated ? "Graduate" : "Participant",
              primaryTag: status,
              secondaryTag: String(student.company_work_for || "").trim() || "Digital Hub",
              status,
              bio: student.bio || "Participant profile.",
              avatar: resolveAvatar(student.avatar_url, "/assets/img/instructor/instructor01.png"),
              order: student.featured_rank ?? 100000 + index,
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
            Number(b.status === "Available" || b.status === "Open to Work") -
              Number(a.status === "Available" || a.status === "Open to Work") || sortByName(a.name, b.name)
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

  const handlePageClick = (event: { selected: number }) => {
    setCurrentPage(event.selected + 1);
  };

  return (
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
                : paginatedItems.map((item, index) => (
                    <div key={item.id} className="col-xl-4 col-md-6">
                      <article
                        className="people-card"
                        data-aos="fade-up"
                        data-aos-delay={(index % 3) * 100}
                      >
                        <div className="people-card__head">
                          <div className="people-card__avatar">
                            <Image src={item.avatar} alt={item.name} />
                          </div>
                          <span
                            className={`people-card__status ${
                              item.status === "Available" || item.status === "Open to Work"
                                ? "is-open"
                                : "is-busy"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <h4 className="people-card__name">{item.name}</h4>
                        <p className="people-card__role">{item.role}</p>
                        <p className="people-card__bio">{item.bio}</p>

                        <div className="people-card__tags">
                          <span>{item.primaryTag}</span>
                          <span>{item.secondaryTag}</span>
                        </div>

                        <Link to="/contact" className="people-card__cta">
                          {modeText[mode].cta}
                        </Link>
                      </article>
                    </div>
                  ))}

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
  );
};

export default PeopleDirectory;
