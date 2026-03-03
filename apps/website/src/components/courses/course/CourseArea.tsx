// File: src/components/courses/course/CourseArea.tsx
// Purpose: UI component responsible for rendering part of the interface (courses/course/CourseArea.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import Link from "@/components/common/Link";
import { useEffect, useRef, useState } from "react";
import ReactPaginate from "react-paginate";
import { mapOpenCohortsToProgramCards, type CohortProgramCard } from "@/lib/cohortProgramMapper";
import { notifyInfo } from "@/lib/feedbackToast";
import { getPublicHomeData, listPublicCohorts } from "@/lib/publicApi";
import { DEFAULT_PROGRAM_CARD_STYLE, resolveProgramCardStyle, type ProgramCardStyle } from "@/lib/programCardStyle";
import CourseSidebar from "./CourseSidebar";
import CourseTop from "./CourseTop";

export default function CourseArea() {
  const [allCourses, setAllCourses] = useState<CohortProgramCard[]>([]);
  const [courses, setCourses] = useState<CohortProgramCard[]>([]);
  const [programCardStyle, setProgramCardStyle] = useState<ProgramCardStyle>(DEFAULT_PROGRAM_CARD_STYLE);
  const [loadError, setLoadError] = useState<string | null>(null);
  const snapshotRef = useRef<string | null>(null);

  const itemsPerPage = 6;
  const [itemOffset, setItemOffset] = useState(0);

  const endOffset = itemOffset + itemsPerPage;
  const currentItems = courses.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(courses.length / itemsPerPage);

  const totalItems = courses.length;
  const startOffset = totalItems === 0 ? 0 : itemOffset + 1;

  useEffect(() => {
    setItemOffset(0);
  }, [courses]);

  const handlePageClick = (event: { selected: number }) => {
    if (courses.length === 0) {
      setItemOffset(0);
      return;
    }
    const newOffset = (event.selected * itemsPerPage) % courses.length;
    setItemOffset(newOffset);
  };

  const [activeTab, setActiveTab] = useState(0);
  const handleTabClick = (index: number) => setActiveTab(index);

  useEffect(() => {
    let active = true;

    const showUpdateNotice = (message: string) => {
      notifyInfo(message, { id: "courses-page-live-update" });
    };

    const loadCohorts = async () => {
      try {
        const cohorts = await listPublicCohorts({
          page: 1,
          limit: 200,
          sortBy: "start_date",
          order: "asc",
        });
        const mapped = mapOpenCohortsToProgramCards(cohorts);
        if (!active) return;

        const nextSnapshot = JSON.stringify(
          mapped.map((item) => ({
            id: item.id,
            status: item.status,
            actionLabel: item.actionLabel,
            shortDescription: item.shortDescription,
          }))
        );
        if (snapshotRef.current && snapshotRef.current !== nextSnapshot) {
          showUpdateNotice("Content updated. Review latest cohort details.");
        }
        snapshotRef.current = nextSnapshot;

        setAllCourses(mapped);
        setCourses(mapped);
        setLoadError(null);
      } catch {
        if (!active) return;
        setLoadError("Unable to load cohorts right now.");
      }
    };

    void loadCohorts();

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      void loadCohorts();
    }, 30000);

    const onFocus = () => {
      void loadCohorts();
    };

    const onVisibility = () => {
      if (!document.hidden) {
        void loadCohorts();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadStyleSetting = async () => {
      try {
        const homeData = await getPublicHomeData();
        if (!active) return;
        setProgramCardStyle(resolveProgramCardStyle(homeData.site_settings));
      } catch {
        if (!active) return;
        setProgramCardStyle(DEFAULT_PROGRAM_CARD_STYLE);
      }
    };

    void loadStyleSetting();

    return () => {
      active = false;
    };
  }, []);

  const renderCardAction = (item: CohortProgramCard) => {
    if (item.isComingSoon) {
      return (
        <span className="dh-program-card__cta dh-program-card__cta--disabled" aria-disabled="true">
          {item.actionLabel}
        </span>
      );
    }

    return (
      <Link to={item.actionHref} className="dh-program-card__cta">
        <span className="text">{item.actionLabel}</span>
        <i className="flaticon-arrow-right"></i>
      </Link>
    );
  };

  const getProgramIconClass = (programName: string) => {
    const normalized = programName.toLowerCase();
    if (normalized.includes("design") || normalized.includes("ui") || normalized.includes("ux")) {
      return "fas fa-palette";
    }
    if (normalized.includes("data") || normalized.includes("analytics") || normalized.includes("analysis")) {
      return "fas fa-chart-line";
    }
    if (normalized.includes("ai") || normalized.includes("ml") || normalized.includes("machine")) {
      return "fas fa-robot";
    }
    if (normalized.includes("marketing") || normalized.includes("media")) {
      return "fas fa-bullhorn";
    }
    if (normalized.includes("network") || normalized.includes("security")) {
      return "fas fa-shield-alt";
    }
    return "fas fa-code";
  };

  return (
    <section className="all-courses-area section-py-120">
      <div className="container">
        <div className="row">
          <CourseSidebar courses={courses} allCourses={allCourses} setCourses={setCourses} />

          <div className="col-xl-9 col-lg-8">
            <CourseTop
              allCourses={allCourses}
              startOffset={startOffset}
              endOffset={Math.min(endOffset, totalItems)}
              totalItems={totalItems}
              setCourses={setCourses}
              handleTabClick={handleTabClick}
              activeTab={activeTab}
            />

            <div className="tab-content" id="myTabContent">
              <div
                className={`tab-pane fade ${activeTab === 0 ? "show active" : ""}`}
                id="grid"
              >
                <div className="row courses__grid-wrap row-cols-1 row-cols-xl-3 row-cols-lg-3 row-cols-md-2 row-cols-sm-1">
                  {currentItems.map((item) => (
                    <div key={item.id} className="col">
                      <div className={`courses__item dh-program-card dh-program-card--${item.status} dh-program-card--style-${programCardStyle}`}>
                        {programCardStyle === "modern" ? (
                          <>
                            <div className="dh-program-card__hero">
                              <span className="dh-program-card__icon">
                                <i className={getProgramIconClass(item.category.name)}></i>
                              </span>
                              <span className={`dh-program-card__status-pill dh-program-card__status-pill--${item.status}`}>
                                {item.level}
                              </span>
                              <p className="dh-program-card__hero-program">{item.category.name}</p>
                              <span className="dh-program-card__hero-mark" aria-hidden="true">
                                <i className={getProgramIconClass(item.category.name)}></i>
                              </span>
                            </div>
                            <div className="dh-program-card__body">
                              <h5 className="title">
                                {item.isComingSoon ? <span>{item.title}</span> : <Link to={item.actionHref}>{item.title}</Link>}
                              </h5>

                              <p className="dh-program-card__desc">{item.shortDescription}</p>

                              <ul className="dh-program-card__meta list-wrap">
                                <li>
                                  <i className="far fa-clock"></i>
                                  <strong>{item.durationLabel}</strong>
                                </li>
                                <li>
                                  <i className="fas fa-book-open"></i>
                                  <strong>{item.category.name}</strong>
                                </li>
                              </ul>

                              <div className="dh-program-card__bottom">{renderCardAction(item)}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="dh-program-card__thumb">
                              {item.isComingSoon ? (
                                <img src={item.thumb} alt={item.title} loading="lazy" />
                              ) : (
                                <Link to={item.actionHref} className="dh-program-card__thumb-link">
                                  <img src={item.thumb} alt={item.title} loading="lazy" />
                                </Link>
                              )}
                              <span className={`dh-program-card__status-pill dh-program-card__status-pill--${item.status}`}>
                                {item.level}
                              </span>
                            </div>

                            <div className="dh-program-card__body dh-program-card__body--classic">
                              <span className="dh-program-card__chip">{item.category.name}</span>

                              <h5 className="title">
                                {item.isComingSoon ? <span>{item.title}</span> : <Link to={item.actionHref}>{item.title}</Link>}
                              </h5>

                              <p className="dh-program-card__desc">{item.shortDescription}</p>

                              <ul className="dh-program-card__meta dh-program-card__meta--two-col list-wrap">
                                <li>
                                  <i className="far fa-clock"></i>
                                  <strong>{item.durationLabel}</strong>
                                </li>
                                <li>
                                  <i className="fas fa-book-open"></i>
                                  <strong>{item.category.name}</strong>
                                </li>
                              </ul>

                              <div className="dh-program-card__bottom">{renderCardAction(item)}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {currentItems.length === 0 && (
                    <div className="col-12">
                      <p>{loadError || "No cohorts available right now."}</p>
                    </div>
                  )}
                </div>

                <nav className="pagination__wrap mt-30">
                  <ReactPaginate
                    breakLabel="..."
                    onPageChange={handlePageClick}
                    pageRangeDisplayed={3}
                    pageCount={pageCount}
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
              </div>

              <div
                className={`tab-pane fade ${activeTab === 1 ? "show active" : ""}`}
                id="list"
              >
                <div className="row courses__list-wrap row-cols-1">
                  {currentItems.map((item) => (
                    <div key={item.id} className="col">
                      <div className={`courses__item dh-program-card dh-program-card--list dh-program-card--${item.status} dh-program-card--style-${programCardStyle}`}>
                        {programCardStyle === "modern" ? (
                          <>
                            <div className="dh-program-card__hero dh-program-card__hero--list-modern">
                              <span className="dh-program-card__icon">
                                <i className={getProgramIconClass(item.category.name)}></i>
                              </span>
                              <span className={`dh-program-card__status-pill dh-program-card__status-pill--${item.status}`}>
                                {item.level}
                              </span>
                              <p className="dh-program-card__hero-program">{item.category.name}</p>
                              <span className="dh-program-card__hero-mark" aria-hidden="true">
                                <i className={getProgramIconClass(item.category.name)}></i>
                              </span>
                            </div>
                            <div className="dh-program-card__body dh-program-card__body--list">
                              <h5 className="title">
                                {item.isComingSoon ? <span>{item.title}</span> : <Link to={item.actionHref}>{item.title}</Link>}
                              </h5>

                              <p className="dh-program-card__desc">{item.shortDescription}</p>

                              <ul className="dh-program-card__meta list-wrap">
                                <li>
                                  <i className="far fa-clock"></i>
                                  <strong>{item.durationLabel}</strong>
                                </li>
                                <li>
                                  <i className="fas fa-book-open"></i>
                                  <strong>{item.category.name}</strong>
                                </li>
                              </ul>

                              <div className="dh-program-card__bottom">{renderCardAction(item)}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="dh-program-card__thumb dh-program-card__thumb--list">
                              {item.isComingSoon ? (
                                <img src={item.thumb} alt={item.title} loading="lazy" />
                              ) : (
                                <Link to={item.actionHref} className="dh-program-card__thumb-link">
                                  <img src={item.thumb} alt={item.title} loading="lazy" />
                                </Link>
                              )}
                              <span className={`dh-program-card__status-pill dh-program-card__status-pill--${item.status}`}>
                                {item.level}
                              </span>
                            </div>

                            <div className="dh-program-card__body dh-program-card__body--classic dh-program-card__body--list">
                              <span className="dh-program-card__chip">{item.category.name}</span>

                              <h5 className="title">
                                {item.isComingSoon ? <span>{item.title}</span> : <Link to={item.actionHref}>{item.title}</Link>}
                              </h5>

                              <p className="dh-program-card__desc">{item.shortDescription}</p>

                              <ul className="dh-program-card__meta dh-program-card__meta--two-col list-wrap">
                                <li>
                                  <i className="far fa-clock"></i>
                                  <strong>{item.durationLabel}</strong>
                                </li>
                                <li>
                                  <i className="fas fa-book-open"></i>
                                  <strong>{item.category.name}</strong>
                                </li>
                              </ul>

                              <div className="dh-program-card__bottom">{renderCardAction(item)}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
