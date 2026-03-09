// File: frontend/src/components/homes/home-one/CourseArea.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";
import Link from "@/components/common/Link";
import { mapOpenCohortsToProgramCards } from "@/lib/cohortProgramMapper";
import { getCmsBoolean, getCmsNumber, getCmsString } from "@/lib/cmsContent";
import { getPublicHomeData, listPublicCohorts } from "@/lib/publicApi";
import { DEFAULT_PROGRAM_CARD_STYLE, resolveProgramCardStyle, type ProgramCardStyle } from "@/lib/programCardStyle";

interface StyleType {
  style?: boolean;
  content?: Record<string, unknown> | null;
}

const setting = {
  slidesPerView: 2.85,
  slidesPerGroup: 1,
  spaceBetween: 14,
  centeredSlides: false,
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
    1500: { slidesPerView: 2.9, spaceBetween: 14 },
    1200: { slidesPerView: 2.6, spaceBetween: 14 },
    992: { slidesPerView: 2.2, spaceBetween: 12 },
    768: { slidesPerView: 1.62, spaceBetween: 12 },
    576: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 0 },
    0: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 0 },
  },
};
const HOME_STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
] as const;

export default function CourseArea({ style, content }: StyleType) {
  const [activeTab, setActiveTab] = useState(0);
  const [programs, setPrograms] = useState<ReturnType<typeof mapOpenCohortsToProgramCards>>([]);
  const [programCardStyle, setProgramCardStyle] = useState<ProgramCardStyle>(DEFAULT_PROGRAM_CARD_STYLE);
  const [loadError, setLoadError] = useState<string | null>(null);
  const swiperRef = useRef<SwiperClass | null>(null);
  const maxCards = Math.trunc(getCmsNumber(content, ["limit", "max_items", "items_limit"], 6, 1, 24));
  const sectionSubtitle = getCmsString(content, ["subtitle", "sub_title"], "Programs & Cohorts");
  const sectionTitle = getCmsString(content, ["title", "heading"], "Explore Current and Upcoming Cohorts");
  const sectionDescription = getCmsString(
    content,
    ["description", "body"],
    "Open cohorts support direct enrollment, while other cohorts show details."
  );
  const allTabLabel = "All";
  const emptyStateText = getCmsString(content, ["empty_state_text"], "No cohorts available at the moment.");
  const moreButtonText = getCmsString(content, ["more_button_text", "cta_text"], "See More Programs");
  const moreButtonLink = getCmsString(content, ["more_button_link", "cta_link"], "/programs");
  const showStatusTabs = getCmsBoolean(content, ["show_status_tabs"], true);
  const backgroundImage = getCmsString(content, ["background_image_url", "backgroundImageUrl"], "courses_bg.jpg");
  const backgroundImageUrl =
    backgroundImage.startsWith("/") || backgroundImage.startsWith("http")
      ? backgroundImage
      : `/assets/img/bg/${backgroundImage}`;
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

    const loadCohorts = async () => {
      try {
        const cohorts = await listPublicCohorts({
          page: 1,
          limit: 200,
          sortBy: "start_date",
          order: "asc",
        });
        if (!active) return;
        const mapped = mapOpenCohortsToProgramCards(cohorts).slice(0, maxCards);

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
  }, [maxCards]);

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

  const statusFilters = useMemo(() => HOME_STATUS_FILTERS, []);

  const filteredPrograms =
    !showStatusTabs || activeTab === 0
      ? programs
      : programs.filter((p) => p.status === statusFilters[activeTab - 1]?.value);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    swiper.slideTo(0, 0);
    swiper.update();
    bindNavigation();
  }, [activeTab, filteredPrograms.length]);

  const renderCardAction = (actionLabel: string, actionHref: string, isActionDisabled: boolean) => {
    if (isActionDisabled) {
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
      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
    >
      <div className="container">
        <div className="section__title-wrap">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="section__title text-center mb-40">
                <span className="sub-title">{sectionSubtitle}</span>
                <h2 className="title">{sectionTitle}</h2>
                <p className="desc">{sectionDescription}</p>
              </div>

              <div className="courses__nav">
                <ul className="nav nav-tabs">
                  <li onClick={() => setActiveTab(0)} className="nav-item">
                    <button className={`nav-link ${activeTab === 0 ? "active" : ""}`}>
                      {allTabLabel}
                    </button>
                  </li>

                  {showStatusTabs && statusFilters.map((status, index) => (
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
                          {item.isActionDisabled ? <span>{item.title}</span> : <Link to={item.actionHref}>{item.title}</Link>}
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
                          {renderCardAction(item.actionLabel, item.actionHref, item.isActionDisabled)}
                        </div>
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
                        <h5 className="title">
                          {item.isActionDisabled ? <span>{item.title}</span> : <Link to={item.actionHref}>{item.title}</Link>}
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
                          {renderCardAction(item.actionLabel, item.actionHref, item.isActionDisabled)}
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
            <p>{loadError || emptyStateText}</p>
          </div>
        )}

        <div className="dh-programs-more">
          <Link to={moreButtonLink} className="btn">
            {moreButtonText}
          </Link>
        </div>
      </div>
    </section>
  );
}
