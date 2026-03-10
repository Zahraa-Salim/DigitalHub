// File: frontend/src/components/homes/home-one/Announcements.tsx
// Purpose: Renders the announcements UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

"use client";

import Link from "@/components/common/Link";
import { getCmsNumber, getCmsString } from "@/lib/cmsContent";
import { listPublicAnnouncements, type PublicAnnouncement } from "@/lib/publicApi";
import { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";

type AnnouncementsProps = {
  content?: Record<string, unknown> | null;
};

type AnnouncementTone = "cohort" | "event" | "general";

const sliderSettings = {
  slidesPerView: 3,
  slidesPerGroup: 1,
  spaceBetween: 22,
  loop: false,
  allowTouchMove: true,
  grabCursor: true,
  navigation: {
    prevEl: ".home-announcements-arrow-prev",
    nextEl: ".home-announcements-arrow-next",
  },
  breakpoints: {
    1400: { slidesPerView: 3, spaceBetween: 24 },
    1200: { slidesPerView: 2.75, spaceBetween: 22 },
    992: { slidesPerView: 2.1, spaceBetween: 18 },
    768: { slidesPerView: 1.45, spaceBetween: 16 },
    576: { slidesPerView: 1, spaceBetween: 12 },
    0: { slidesPerView: 1, spaceBetween: 12 },
  },
};

const formatAnnouncementDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const resolveAnnouncementMeta = (item: PublicAnnouncement) => {
  if (item.cohort_id) {
    const isOpen = item.cohort_status === "open";
    return {
      tone: "cohort" as AnnouncementTone,
      label: isOpen ? "Open Cohort" : "Coming Soon",
      href: isOpen ? `/apply?cohortId=${item.cohort_id}` : `/cohorts/${item.cohort_id}`,
      actionLabel: isOpen ? "Apply Now" : "View Cohort",
      eyebrow: item.program_title || "Cohort Update",
      note: isOpen ? "Applications are live now." : "Enrollment opens soon.",
    };
  }

  if (item.event_id && item.event_slug) {
    return {
      tone: "event" as AnnouncementTone,
      label: "Upcoming Event",
      href: `/events/${item.event_slug}`,
      actionLabel: "View Event",
      eyebrow: item.event_title || "Event Update",
      note: "Save the date and review the agenda.",
    };
  }

  return {
    tone: "general" as AnnouncementTone,
    label: "Announcement",
    href: "/programs",
    actionLabel: "Learn More",
    eyebrow: "Digital Hub",
    note: "Latest update from Digital Hub.",
  };
};

const Announcements = ({ content }: AnnouncementsProps) => {
  const [items, setItems] = useState<PublicAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const swiperRef = useRef<SwiperClass | null>(null);

  const sectionSubtitle = getCmsString(
    content,
    ["subtitle", "sub_title"],
    "Latest Updates",
  );
  const sectionTitle = getCmsString(
    content,
    ["title", "heading"],
    "What Is Happening At The Digital Hub",
  );
  const sectionDescription = getCmsString(
    content,
    ["description", "body", "text"],
    "Track important updates across upcoming events, cohort announcements, and new opportunities published by the team.",
  );
  const cardsLimit = Math.trunc(getCmsNumber(content, ["limit", "card_limit", "items_limit"], 6, 1, 24));
  useEffect(() => {
    let active = true;

    const loadAnnouncements = async () => {
      try {
        const rows = await listPublicAnnouncements({
          page: 1,
          limit: 200,
          sortBy: "publish_at",
          order: "desc",
        });
        if (!active) return;
        setItems(Array.isArray(rows) ? rows.filter((row) => Boolean(row?.title)) : []);
      } catch {
        if (!active) return;
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadAnnouncements();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(
    () =>
      items
        .slice(0, cardsLimit)
        .map((item) => ({
          ...item,
          meta: resolveAnnouncementMeta(item),
          displayDate: formatAnnouncementDate(item.publish_at || item.created_at),
          secondaryDate: formatAnnouncementDate(item.event_starts_at || null),
        })),
    [cardsLimit, items],
  );

  const bindNavigation = () => {
    const swiper = swiperRef.current;
    if (!swiper || !swiper.navigation) return;
    const navigationParams =
      typeof swiper.params.navigation === "boolean" ? {} : swiper.params.navigation;
    swiper.params.navigation = {
      ...navigationParams,
      prevEl: ".home-announcements-arrow-prev",
      nextEl: ".home-announcements-arrow-next",
    };
    swiper.navigation.destroy();
    swiper.navigation.init();
    swiper.navigation.update();
  };

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    swiper.slideTo(0, 0);
    swiper.update();
    bindNavigation();
  }, [cards.length]);

  if (loading || cards.length === 0) {
    return null;
  }

  return (
    <section className="home-announcements section-py-120">
      <div className="container">
        <div className="home-announcements__header">
          <div className="section__title mb-0">
            <span className="sub-title">{sectionSubtitle}</span>
            <h2 className="title">{sectionTitle}</h2>
            <p>{sectionDescription}</p>
          </div>
        </div>

        <div className="home-announcements-slider-wrap">
          <div className="home-announcements-viewport">
            <Swiper
              {...sliderSettings}
              modules={[Navigation]}
              className="swiper home-announcements-swiper"
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                window.setTimeout(() => {
                  bindNavigation();
                }, 0);
              }}
            >
              {cards.map((item, index) => (
                <SwiperSlide key={item.id}>
                  <article
                    className={`home-announcements__card home-announcements__card--${item.meta.tone}`}
                    data-aos="fade-up"
                    data-aos-delay={120 + index * 90}
                  >
                    <div className="home-announcements__card-top">
                      <span className={`home-announcements__pill home-announcements__pill--${item.meta.tone}`}>
                        {item.meta.label}
                      </span>
                      {item.displayDate ? (
                        <span className="home-announcements__date">{item.displayDate}</span>
                      ) : null}
                    </div>

                    <div className="home-announcements__body">
                      <span className="home-announcements__kicker">{item.meta.eyebrow}</span>
                      <h3>{item.title}</h3>
                      <p>{item.body || "New update published by the Digital Hub team."}</p>
                      <div className="home-announcements__meta-note">
                        <span>{item.secondaryDate ? "Starts" : "Status"}</span>
                        <strong>{item.secondaryDate || item.meta.note}</strong>
                      </div>
                    </div>

                    <div className="home-announcements__footer">
                      <Link to={item.meta.href} className="home-announcements__link">
                        <span>{item.meta.actionLabel}</span>
                        <i className="flaticon-arrow-right" />
                      </Link>
                    </div>
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {cards.length > 1 ? (
            <div className="home-announcements-controls" aria-hidden="true">
              <button type="button" className="home-announcements-arrow home-announcements-arrow-prev" aria-label="Previous announcements">
                <i className="flaticon-arrow-right" />
              </button>
              <button type="button" className="home-announcements-arrow home-announcements-arrow-next" aria-label="Next announcements">
                <i className="flaticon-arrow-right" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default Announcements;

