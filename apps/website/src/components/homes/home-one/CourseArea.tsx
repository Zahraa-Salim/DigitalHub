// File: src/components/homes/home-one/CourseArea.tsx
// Purpose: UI component responsible for rendering part of the interface (homes/home-one/CourseArea.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";
import Link from "@/components/common/Link";
import { mapOpenCohortsToProgramCards } from "@/lib/cohortProgramMapper";
import { notifyInfo } from "@/lib/feedbackToast";
import { getPublicHomeData, listPublicCohorts } from "@/lib/publicApi";
import { DEFAULT_PROGRAM_CARD_STYLE, resolveProgramCardStyle, type ProgramCardStyle } from "@/lib/programCardStyle";

interface StyleType {
  style?: boolean;
}

const setting = {
  slidesPerView: 3,
  spaceBetween: 24,
  allowTouchMove: true,
  grabCursor: true,
  simulateTouch: true,
  touchStartPreventDefault: true,
  resistanceRatio: 0.85,
  observer: true,
  observeParents: true,
  watchOverflow: false,
  autoplay: false,
  navigation: {
    prevEl: ".home-cohorts-arrow-prev",
    nextEl: ".home-cohorts-arrow-next",
  },
  breakpoints: {
    1500: { slidesPerView: 3, spaceBetween: 20 },
    1200: { slidesPerView: 2.7, spaceBetween: 18 },
    992: { slidesPerView: 2.2, spaceBetween: 16 },
    768: { slidesPerView: 1.55, spaceBetween: 18 },
    576: { slidesPerView: 1.2, spaceBetween: 16 },
    0: { slidesPerView: 1.05, spaceBetween: 14 },
  },
};
const STATUS_FILTER_ORDER = ["open", "running", "coming_soon", "planned", "completed", "cancelled"] as const;

export default function CourseArea({ style }: StyleType) {
  const [activeTab, setActiveTab] = useState(0);
  const [programs, setPrograms] = useState<ReturnType<typeof mapOpenCohortsToProgramCards>>([]);
  const [programCardStyle, setProgramCardStyle] = useState<ProgramCardStyle>(DEFAULT_PROGRAM_CARD_STYLE);
  const [loadError, setLoadError] = useState<string | null>(null);
  const snapshotRef = useRef<string | null>(null);
  const swiperRef = useRef<SwiperClass | null>(null);

  const bindNavigation = () => {
    const swiper = swiperRef.current;
    if (!swiper || !swiper.navigation) return;
    const navigationParams =
      typeof swiper.params.navigation === "boolean" ? {} : swiper.params.navigation;
    swiper.params.navigation = {
      ...navigationParams,
      prevEl: ".home-cohorts-arrow-prev",
      nextEl: ".home-cohorts-arrow-next",
    };
    swiper.navigation.destroy();
    swiper.navigation.init();
    swiper.navigation.update();
  };

  useEffect(() => {
    let active = true;

    const showUpdateNotice = (message: string) => {
      notifyInfo(message, { id: "home-cohorts-live-update" });
    };

    const loadCohorts = async () => {
      try {
        const cohorts = await listPublicCohorts({
          page: 1,
          limit: 200,
          sortBy: "start_date",
          order: "asc",
        });
        if (!active) return;
        const mapped = mapOpenCohortsToProgramCards(cohorts).slice(0, 6);
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

        setPrograms(mapped);
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

  const statusFilters = useMemo(() => {
    const getStatusOrder = (status: string) => {
      const index = STATUS_FILTER_ORDER.indexOf(status as (typeof STATUS_FILTER_ORDER)[number]);
      return index === -1 ? STATUS_FILTER_ORDER.length : index;
    };

    const uniqueStatuses = Array.from(new Set(programs.map((program) => program.status)));
    const ordered = uniqueStatuses.sort(
      (a, b) => getStatusOrder(a) - getStatusOrder(b)
    );

    return ordered.map((status) => {
      const sample = programs.find((program) => program.status === status);
      return {
        value: status,
        label: sample?.level || status.replaceAll("_", " "),
      };
    });
  }, [programs]);

  const filteredPrograms =
    activeTab === 0
      ? programs
      : programs.filter((p) => p.status === statusFilters[activeTab - 1]?.value);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    swiper.slideTo(0, 0);
    swiper.update();
    bindNavigation();
  }, [activeTab, filteredPrograms.length]);

  const renderCardAction = (actionLabel: string, actionHref: string, isComingSoon: boolean) => {
    if (isComingSoon) {
      return (
        <span className="dh-program-card__cta dh-program-card__cta--disabled" aria-disabled="true">
          {actionLabel}
        </span>
      );
    }

    return (
      <Link to={actionHref} className="dh-program-card__cta">
        <span className="text">{actionLabel}</span>
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
    <section
      className={`courses-area ${style ? "section-py-120" : "section-pt-120 section-pb-90"}`}
      style={{ backgroundImage: "url(/assets/img/bg/courses_bg.jpg)" }}
    >
      <div className="container">
        <div className="section__title-wrap">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="section__title text-center mb-40">
                <span className="sub-title">Programs & Cohorts</span>
                <h2 className="title">Explore Current and Upcoming Cohorts</h2>
                <p className="desc">Open cohorts support direct enrollment, while other cohorts show details.</p>
              </div>

              <div className="courses__nav">
                <ul className="nav nav-tabs">
                  <li onClick={() => setActiveTab(0)} className="nav-item">
                    <button className={`nav-link ${activeTab === 0 ? "active" : ""}`}>
                      All Cohorts
                    </button>
                  </li>

                  {statusFilters.map((status, index) => (
                    <li key={status.value} onClick={() => setActiveTab(index + 1)} className="nav-item">
                      <button className={`nav-link ${activeTab === index + 1 ? "active" : ""}`}>
                        {status.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="home-cohorts-slider-wrap">
          <div className="home-cohorts-viewport">
            <Swiper
              {...setting}
              loop={false}
              modules={[Navigation]}
              className="swiper courses-swiper-active"
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                window.setTimeout(() => {
                  bindNavigation();
                }, 0);
              }}
            >
              {filteredPrograms.map((item) => (
                <SwiperSlide key={item.id}>
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

                        <div className="dh-program-card__bottom">
                          {renderCardAction(item.actionLabel, item.actionHref, item.isComingSoon)}
                        </div>
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

                        <div className="dh-program-card__bottom">
                          {renderCardAction(item.actionLabel, item.actionHref, item.isComingSoon)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {!style && filteredPrograms.length > 1 && (
            <div className="home-cohorts-controls" aria-label="Cohorts navigation">
              <button type="button" className="home-cohorts-arrow home-cohorts-arrow-prev" aria-label="Previous cohorts">
                <i className="flaticon-arrow-right"></i>
              </button>
              <button type="button" className="home-cohorts-arrow home-cohorts-arrow-next" aria-label="Next cohorts">
                <i className="flaticon-arrow-right"></i>
              </button>
            </div>
          )}
        </div>

        {filteredPrograms.length === 0 && (
          <div className="text-center mt-30">
            <p>{loadError || "No cohorts available at the moment."}</p>
          </div>
        )}

        <div className="dh-programs-more">
          <Link to="/courses" className="btn">
            See More Programs
          </Link>
        </div>
      </div>
    </section>
  );
}
