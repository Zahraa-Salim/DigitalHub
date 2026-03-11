// File: frontend/src/components/courses/course/CourseArea.tsx
// Purpose: Renders the course area UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

"use client";

import Link from "@/components/common/Link";
import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { mapOpenCohortsToProgramCards, type CohortProgramCard } from "@/lib/cohortProgramMapper";
import { getPublicHomeData, listPublicCohorts } from "@/lib/publicApi";
import { DEFAULT_PROGRAM_CARD_STYLE, resolveProgramCardStyle, type ProgramCardStyle } from "@/lib/programCardStyle";
import CourseSidebar from "./CourseSidebar";
import CourseTop from "./CourseTop";

export default function CourseArea() {
  const [allCourses, setAllCourses] = useState<CohortProgramCard[]>([]);
  const [courses, setCourses] = useState<CohortProgramCard[]>([]);
  const [programCardStyle, setProgramCardStyle] = useState<ProgramCardStyle>(DEFAULT_PROGRAM_CARD_STYLE);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const itemsPerPage = 6;
  const [itemOffset, setItemOffset] = useState(0);

  const normalizedOffset = courses.length === 0 || itemOffset < courses.length ? itemOffset : 0;
  const endOffset = normalizedOffset + itemsPerPage;
  const currentItems = courses.slice(normalizedOffset, endOffset);
  const pageCount = Math.ceil(courses.length / itemsPerPage);

  const totalItems = courses.length;
  const startOffset = totalItems === 0 ? 0 : normalizedOffset + 1;
  const showSkeletonCards = !hasLoadedOnce || (Boolean(loadError) && totalItems === 0);
  const skeletonItems = Array.from({ length: itemsPerPage }, (_value, index) => index);

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

        setAllCourses(mapped);
        setCourses(mapped);
        setLoadError(null);
      } catch {
        if (!active) return;
        setLoadError("Unable to load programs right now.");
      } finally {
        if (!active) return;
        setHasLoadedOnce(true);
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
    if (item.isActionDisabled) {
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
          <CourseSidebar allCourses={allCourses} setCourses={setCourses} />

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
                  {showSkeletonCards &&
                    skeletonItems.map((item) => (
                      <div key={`grid-skeleton-${item}`} className="col">
                        <div className="courses__item dh-program-card dh-program-card--skeleton">
                          <div className="dh-program-card__hero dh-program-card__hero--skeleton">
                            <span className="dh-program-skeleton-block dh-program-skeleton-block--icon" />
                            <span className="dh-program-skeleton-block dh-program-skeleton-block--pill" />
                            <span className="dh-program-skeleton-block dh-program-skeleton-block--program" />
                          </div>
                          <div className="dh-program-card__body">
                            <span className="dh-program-skeleton-block dh-program-skeleton-block--title" />
                            <span className="dh-program-skeleton-block dh-program-skeleton-block--desc" />
                            <span className="dh-program-skeleton-block dh-program-skeleton-block--desc dh-program-skeleton-block--desc-short" />
                            <ul className="dh-program-card__meta list-wrap">
                              <li><span className="dh-program-skeleton-block dh-program-skeleton-block--meta" /></li>
                              <li><span className="dh-program-skeleton-block dh-program-skeleton-block--meta" /></li>
                            </ul>
                            <div className="dh-program-card__bottom">
                              <span className="dh-program-skeleton-block dh-program-skeleton-block--cta" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

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
                                <Link to={item.detailHref}>{item.title}</Link>
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
                              {item.isActionDisabled ? (
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
                                <Link to={item.detailHref}>{item.title}</Link>
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

                  {!showSkeletonCards && currentItems.length === 0 && (
                    <div className="col-12">
                      <p>No programs available right now.</p>
                    </div>
                  )}
                </div>

                {!showSkeletonCards && pageCount > 1 && (
                  <nav className="pagination__wrap mt-30">
                    <ReactPaginate
                      breakLabel="..."
                      onPageChange={handlePageClick}
                      pageRangeDisplayed={3}
                      pageCount={pageCount}
                      forcePage={Math.floor(normalizedOffset / itemsPerPage)}
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

              <div
                className={`tab-pane fade ${activeTab === 1 ? "show active" : ""}`}
                id="list"
              >
                <div className="row courses__list-wrap row-cols-1">
                  {showSkeletonCards &&
                    skeletonItems.map((item) => (
                      <div key={`list-skeleton-${item}`} className="col">
                        <div className="courses__item dh-program-card dh-program-card--list dh-program-card--skeleton">
                          <div className="dh-program-card__thumb dh-program-card__thumb--list dh-program-card__thumb--skeleton" />
                          <div className="dh-program-card__body dh-program-card__body--list">
                            <span className="dh-program-skeleton-block dh-program-skeleton-block--title" />
                            <span className="dh-program-skeleton-block dh-program-skeleton-block--desc" />
                            <span className="dh-program-skeleton-block dh-program-skeleton-block--desc dh-program-skeleton-block--desc-short" />
                            <ul className="dh-program-card__meta list-wrap">
                              <li><span className="dh-program-skeleton-block dh-program-skeleton-block--meta" /></li>
                              <li><span className="dh-program-skeleton-block dh-program-skeleton-block--meta" /></li>
                            </ul>
                            <div className="dh-program-card__bottom">
                              <span className="dh-program-skeleton-block dh-program-skeleton-block--cta" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

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
                                <Link to={item.detailHref}>{item.title}</Link>
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
                              {item.isActionDisabled ? (
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
                                <Link to={item.detailHref}>{item.title}</Link>
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

