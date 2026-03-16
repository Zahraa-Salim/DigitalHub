// File: frontend/src/components/inner-pages/events/EventsArea.tsx
// Purpose: Renders the events area UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

"use client";

import { AnnouncementCard, resolveAnnouncementCardProps } from "@/components/common/AnnouncementCard";
import Image from "@/components/common/Image";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsBoolean, getCmsNumber, getCmsString } from "@/lib/cmsContent";
import {
  API_BASE_URL,
  listPublicAnnouncementsPage,
  listPublicEvents,
  type PublicAnnouncement,
  type PublicEvent,
} from "@/lib/publicApi";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactPaginate from "react-paginate";
import { useSearchParams } from "react-router-dom";

const toAbsolutePublicUrl = (value?: string | null) => {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  try {
    return `${new URL(API_BASE_URL).origin}${normalized}`;
  } catch {
    return `${API_BASE_URL.replace(/\/$/, "")}${normalized}`;
  }
};

const formatEventDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatEventDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const applyTemplate = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

const MODAL_SLIDE_AUTOPLAY_MS = 3200;
const EVENTS_PER_PAGE = 6;
const DEFAULT_ANNOUNCEMENTS_PER_PAGE = 6;

type EventStatusFilter = "all" | "upcoming" | "live" | "completed";

const EVENT_STATUS_LABELS: Record<Exclude<EventStatusFilter, "all">, string> = {
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
};

const EVENT_STATUS_ORDER: EventStatusFilter[] = ["all", "upcoming", "completed"];

const toSizedImageUrl = (value: string, width: number, quality = 72) => {
  try {
    const parsed = new URL(value);
    if (!parsed.hostname.includes("images.unsplash.com")) return value;
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    parsed.searchParams.set("w", String(width));
    parsed.searchParams.set("q", String(quality));
    return parsed.toString();
  } catch {
    return value;
  }
};

const parseDateValue = (value?: string | null) => {
  if (!value) return Number.NaN;
  const parsed = new Date(value);
  return parsed.getTime();
};

const deriveEventStatus = (event: PublicEvent, nowTs: number): Exclude<EventStatusFilter, "all"> => {
  if (event.is_done) return "completed";
  const startTs = parseDateValue(event.starts_at);
  const endTs = parseDateValue(event.ends_at);

  if (!Number.isNaN(endTs) && endTs < nowTs) return "completed";
  if (!Number.isNaN(startTs) && startTs <= nowTs && (Number.isNaN(endTs) || endTs >= nowTs)) return "live";
  return "upcoming";
};

const EventsArea = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isAutoSlidePaused, setIsAutoSlidePaused] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [announcementTotalPages, setAnnouncementTotalPages] = useState(1);
  const [loadedImageMap, setLoadedImageMap] = useState<Record<string, boolean>>({});
  const [previousMainImage, setPreviousMainImage] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const imageTransitionTimerRef = useRef<number | null>(null);
  const previousMainImageRef = useRef<string | null>(null);
  const announcementsRef = useRef<HTMLDivElement | null>(null);
  const page = useCmsPage("events");
  const pageContent = page?.content ?? null;
  const sectionSubtitle = getCmsString(pageContent, ["subtitle", "sub_title"], "Events");
  const sectionTitle = getCmsString(
    pageContent,
    ["title", "heading", "hero_title", "heroTitle"],
    "Community Moments at The Digital Hub",
  );
  const sectionBody = getCmsString(
    pageContent,
    ["description", "body", "text", "hero_subtitle", "heroSubtitle"],
    "The Digital Hub is UNRWA's learning-to-employment platform where youth build digital skills, ship real projects, and grow through mentors, cohorts, and community events.",
  );
  const resultsSummaryTemplate = getCmsString(
    pageContent,
    ["results_summary_template", "resultsSummaryTemplate"],
    "Showing {start}-{end} Of {total} Results",
  );
  const filterAllLabel = getCmsString(pageContent, ["filter_all_label", "filterAllLabel"], "All");
  const filterUpcomingLabel = getCmsString(pageContent, ["filter_upcoming_label", "filterUpcomingLabel"], "Upcoming");
  const filterCompletedLabel = getCmsString(pageContent, ["filter_completed_label", "filterCompletedLabel"], "Completed");
  const viewDetailsText = getCmsString(pageContent, ["view_details_text", "viewDetailsText"], "View Details");
  const locationFallback = getCmsString(pageContent, ["location_fallback", "locationFallback"], "The Digital Hub");
  const photosSuffix = getCmsString(pageContent, ["photos_suffix", "photosSuffix"], "photos");
  const emptyStateText = getCmsString(pageContent, ["empty_state_text", "emptyStateText"], "No events match the selected filters.");
  const errorText = getCmsString(pageContent, ["error_text", "errorText"], "Unable to load events right now.");
  const announcementsSubtitle = getCmsString(
    pageContent,
    ["announcements_subtitle", "announcementsSubtitle"],
    "Updates",
  );
  const announcementsTitle = getCmsString(
    pageContent,
    ["announcements_title", "announcementsTitle"],
    "Latest Announcements",
  );
  const announcementsDescription = getCmsString(
    pageContent,
    ["announcements_description", "announcementsDescription"],
    "Stay up to date with the latest news, cohort openings, and upcoming events.",
  );
  const announcementsLoadErrorText = getCmsString(
    pageContent,
    ["announcements_error_text", "announcementsErrorText"],
    "Unable to load announcements right now.",
  );
  const announcementsShowSection = getCmsBoolean(
    pageContent,
    ["announcements_show_section", "announcementsShowSection"],
    true,
  );
  const announcementsPerPage = Math.trunc(
    getCmsNumber(
      pageContent,
      ["announcements_per_page", "announcementsPerPage"],
      DEFAULT_ANNOUNCEMENTS_PER_PAGE,
      1,
      12,
    ),
  );
  const closeLabel = getCmsString(pageContent, ["close_label", "closeLabel"], "Close details");
  const previousImageLabel = getCmsString(pageContent, ["previous_image_label", "previousImageLabel"], "Previous image");
  const nextImageLabel = getCmsString(pageContent, ["next_image_label", "nextImageLabel"], "Next image");
  const startLabel = getCmsString(pageContent, ["start_label", "startLabel"], "Start");
  const endLabel = getCmsString(pageContent, ["end_label", "endLabel"], "End");
  const locationLabel = getCmsString(pageContent, ["location_label", "locationLabel"], "Location");
  const statusLabel = getCmsString(pageContent, ["status_label", "statusLabel"], "Status");
  const eventPostTitle = getCmsString(pageContent, ["event_post_title", "eventPostTitle"], "Event Post");
  const fallbackPostText = getCmsString(
    pageContent,
    ["fallback_post_text", "fallbackPostText"],
    "Details for this event will be published soon.",
  );
  const notAvailableText = getCmsString(pageContent, ["not_available_text", "notAvailableText"], "N/A");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const rows = await listPublicEvents({
          page: 1,
          limit: 200,
          sortBy: "starts_at",
          order: "asc",
        });
        if (!active) return;
        setEvents(rows);
        setError(null);
      } catch {
        if (!active) return;
        setEvents([]);
        setError(errorText);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [errorText]);

  useEffect(() => {
    if (!announcementsShowSection) {
      setAnnouncements([]);
      setAnnouncementTotalPages(1);
      setAnnouncementsLoading(false);
      setAnnouncementsError(null);
      return;
    }

    let active = true;

    const loadAnnouncements = async () => {
      setAnnouncementsLoading(true);
      try {
        const response = await listPublicAnnouncementsPage({
          page: announcementsPage,
          limit: announcementsPerPage,
          sortBy: "created_at",
          order: "desc",
        });
        if (!active) return;
        setAnnouncements(response.data);
        setAnnouncementTotalPages(Math.max(1, response.pagination.totalPages));
        setAnnouncementsError(null);
      } catch {
        if (!active) return;
        setAnnouncements([]);
        setAnnouncementTotalPages(1);
        setAnnouncementsError(announcementsLoadErrorText);
      } finally {
        if (active) setAnnouncementsLoading(false);
      }
    };

    void loadAnnouncements();
    return () => {
      active = false;
    };
  }, [announcementsLoadErrorText, announcementsPage, announcementsPerPage, announcementsShowSection]);

  useEffect(() => {
    const statusFromQuery = searchParams.get("status");
    const parsedStatus: EventStatusFilter = EVENT_STATUS_ORDER.includes(statusFromQuery as EventStatusFilter)
      ? (statusFromQuery as EventStatusFilter)
      : "all";

    const pageFromQuery = Number.parseInt(searchParams.get("page") || "1", 10);
    const parsedPage = Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1;
    const announcementPageFromQuery = Number.parseInt(searchParams.get("apage") || "1", 10);
    const parsedAnnouncementPage =
      Number.isFinite(announcementPageFromQuery) && announcementPageFromQuery > 0 ? announcementPageFromQuery : 1;

    setStatusFilter((current) => (current === parsedStatus ? current : parsedStatus));
    setCurrentPage((current) => (current === parsedPage ? current : parsedPage));
    setAnnouncementsPage((current) => (current === parsedAnnouncementPage ? current : parsedAnnouncementPage));
  }, [searchParams]);

  const eventRows = useMemo(() => {
    const nowTs = Date.now();
    return events.map((event) => ({
      event,
      status: deriveEventStatus(event, nowTs),
    }));
  }, [events]);

  const statusOptions = useMemo<EventStatusFilter[]>(() => ["all", "upcoming", "completed"], []);

  const processedEvents = useMemo(() => {
    let filtered = eventRows.slice();
    if (statusFilter === "upcoming") {
      filtered = filtered.filter((item) => item.status === "upcoming" || item.status === "live");
    } else if (statusFilter === "completed") {
      filtered = filtered.filter((item) => item.status === "completed");
    }

    filtered.sort((a, b) => {
      const aStart = parseDateValue(a.event.starts_at);
      const bStart = parseDateValue(b.event.starts_at);
      return (Number.isNaN(aStart) ? 0 : aStart) - (Number.isNaN(bStart) ? 0 : bStart);
    });

    return filtered;
  }, [eventRows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(processedEvents.length / EVENTS_PER_PAGE));

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * EVENTS_PER_PAGE;
    return processedEvents.slice(start, start + EVENTS_PER_PAGE);
  }, [currentPage, processedEvents]);

  const rangeStart = processedEvents.length ? (currentPage - 1) * EVENTS_PER_PAGE + 1 : 0;
  const rangeEnd = processedEvents.length
    ? Math.min(currentPage * EVENTS_PER_PAGE, processedEvents.length)
    : 0;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (announcementsPage > announcementTotalPages) {
      setAnnouncementsPage(announcementTotalPages);
    }
  }, [announcementTotalPages, announcementsPage]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (currentPage > 1) next.set("page", String(currentPage));
    if (announcementsPage > 1) next.set("apage", String(announcementsPage));

    const nextString = next.toString();
    if (nextString !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [announcementsPage, currentPage, searchParams, setSearchParams, statusFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#announcements") return;
    if (!announcementsRef.current) return;
    window.requestAnimationFrame(() => {
      announcementsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [announcementsLoading, announcements.length]);

  const toggleStatusFilter = (value: EventStatusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const selectedGallery = useMemo(() => {
    if (!selectedEvent || !Array.isArray(selectedEvent.completion_image_urls)) return [];
    return selectedEvent.completion_image_urls
      .map((item) => toAbsolutePublicUrl(item))
      .map((item) => (item ? toSizedImageUrl(item, 1200, 66) : null))
      .filter((item): item is string => Boolean(item));
  }, [selectedEvent]);

  const selectedThumbGallery = useMemo(
    () => selectedGallery.map((item) => toSizedImageUrl(item, 260, 56)),
    [selectedGallery]
  );

  const selectedMainImage =
    selectedGallery.length > 0 ? selectedGallery[Math.min(activeImageIndex, selectedGallery.length - 1)] : null;
  const isActiveImageLoaded = selectedMainImage ? Boolean(loadedImageMap[selectedMainImage]) : false;
  const selectedEventStatus = selectedEvent ? deriveEventStatus(selectedEvent, Date.now()) : "upcoming";

  useEffect(() => {
    setActiveImageIndex(0);
    setPreviousMainImage(null);
    previousMainImageRef.current = null;
    if (imageTransitionTimerRef.current) {
      window.clearTimeout(imageTransitionTimerRef.current);
      imageTransitionTimerRef.current = null;
    }
  }, [selectedEvent?.id, selectedGallery.length]);

  useEffect(() => {
    if (!selectedMainImage) {
      setPreviousMainImage(null);
      previousMainImageRef.current = null;
      if (imageTransitionTimerRef.current) {
        window.clearTimeout(imageTransitionTimerRef.current);
        imageTransitionTimerRef.current = null;
      }
      return;
    }

    const previous = previousMainImageRef.current;
    if (previous && previous !== selectedMainImage) {
      setPreviousMainImage(previous);
      if (imageTransitionTimerRef.current) {
        window.clearTimeout(imageTransitionTimerRef.current);
      }
      imageTransitionTimerRef.current = window.setTimeout(() => {
        setPreviousMainImage(null);
        imageTransitionTimerRef.current = null;
      }, 560);
    } else {
      setPreviousMainImage(null);
    }

    previousMainImageRef.current = selectedMainImage;
  }, [selectedMainImage]);

  useEffect(() => {
    if (!selectedGallery.length) return;
    let cancelled = false;

    setLoadedImageMap({});

    selectedGallery.forEach((src) => {
      const image = new window.Image();
      image.onload = () => {
        if (cancelled) return;
        setLoadedImageMap((current) => (current[src] ? current : { ...current, [src]: true }));
      };
      image.onerror = () => {
        if (cancelled) return;
        setLoadedImageMap((current) => (current[src] ? current : { ...current, [src]: true }));
      };
      image.src = src;
      if (image.complete) {
        setLoadedImageMap((current) => (current[src] ? current : { ...current, [src]: true }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedGallery]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (imageTransitionTimerRef.current) {
        window.clearTimeout(imageTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEvent(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent || isModalClosing || isAutoSlidePaused || selectedGallery.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % selectedGallery.length);
    }, MODAL_SLIDE_AUTOPLAY_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedEvent, isModalClosing, isAutoSlidePaused, selectedGallery.length]);

  const openDetails = (event: PublicEvent) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsModalClosing(false);
    setIsAutoSlidePaused(false);
    setSelectedEvent(event);
    setActiveImageIndex(0);
  };

  const closeDetails = () => {
    if (!selectedEvent || isModalClosing) return;
    setIsModalClosing(true);
    setIsAutoSlidePaused(false);
    closeTimerRef.current = window.setTimeout(() => {
      setSelectedEvent(null);
      setIsModalClosing(false);
      closeTimerRef.current = null;
    }, 190);
  };

  const showPrevImage = () => {
    if (!selectedGallery.length) return;
    setActiveImageIndex((current) => (current - 1 + selectedGallery.length) % selectedGallery.length);
  };

  const showNextImage = () => {
    if (!selectedGallery.length) return;
    setActiveImageIndex((current) => (current + 1) % selectedGallery.length);
  };

  const handlePageClick = (event: { selected: number }) => {
    setCurrentPage(event.selected + 1);
  };

  const handleAnnouncementsPageClick = (event: { selected: number }) => {
    setAnnouncementsPage(event.selected + 1);
  };

  const showAnnouncementsSection =
    announcementsShowSection && (announcementsLoading || Boolean(announcements.length) || Boolean(announcementsError));

  return (
    <section className="event__area section-py-120">
      <div className="container">
        {showAnnouncementsSection ? (
          <div className="events-announcements" id="announcements" ref={announcementsRef}>
            <div className="section__title-wrap mb-35">
              <div className="row align-items-end">
                <div className="col-lg-8">
                  <div className="section__title">
                    <span className="sub-title">{announcementsSubtitle}</span>
                    <h2 className="title">{announcementsTitle}</h2>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="section__content">
                    <p>{announcementsDescription}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-announcements__list">
                {announcementsLoading
                  ? Array.from({ length: announcementsPerPage }).map((_, index) => (
                      <article
                        className="home-announcements__banner home-announcements__card--skeleton"
                        key={`announcement-skeleton-${index}`}
                        aria-hidden
                      >
                        <div className="home-announcements__banner-main">
                          <div className="home-announcements__banner-top">
                            <span className="home-announcements__pill">&nbsp;</span>
                            <span className="home-announcements__date">&nbsp;</span>
                          </div>
                          <span className="home-announcements__eyebrow">&nbsp;</span>
                          <h3 className="home-announcements__banner-title">&nbsp;</h3>
                          <p className="home-announcements__banner-body">&nbsp;</p>
                        </div>
                        <div className="home-announcements__banner-side">
                          <span className="home-announcements__banner-date">&nbsp;</span>
                        </div>
                      </article>
                    ))
                  : announcements.map((item, index) => (
                      <div key={item.id} data-aos="fade-up" data-aos-delay={(index % 3) * 100}>
                        <AnnouncementCard {...resolveAnnouncementCardProps(item)} />
                      </div>
                    ))}
            </div>

            {!announcementsLoading && !announcementsError && announcementTotalPages > 1 ? (
              <nav className="pagination__wrap mt-30" aria-label="Announcements pagination">
                <ReactPaginate
                  breakLabel="..."
                  onPageChange={handleAnnouncementsPageClick}
                  pageRangeDisplayed={3}
                  pageCount={announcementTotalPages}
                  forcePage={Math.max(0, announcementsPage - 1)}
                  className="list-wrap"
                  previousLabel={
                    <i
                      className="flaticon-arrow-right"
                      style={{ transform: "rotate(180deg)", display: "inline-block" }}
                    ></i>
                  }
                  nextLabel={<i className="flaticon-arrow-right"></i>}
                  previousAriaLabel="Previous announcements page"
                  nextAriaLabel="Next announcements page"
                  previousClassName="previous pagination__arrow"
                  nextClassName="next pagination__arrow"
                />
              </nav>
            ) : null}

            {!announcementsLoading && announcementsError ? (
              <p className="dh-live-note dh-live-note--center">{announcementsError}</p>
            ) : null}
          </div>
        ) : null}

        <div className="section__title-wrap mb-35">
          <div className="row align-items-end">
            <div className="col-lg-8">
              <div className="section__title">
                <span className="sub-title">{sectionSubtitle}</span>
                <h2 className="title">{sectionTitle}</h2>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="section__content">
                <p>{sectionBody}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="events-controls">
              <div className="people-toolbar events-toolbar">
                <div className="events-toolbar__left">
                  <p className="people-toolbar__count events-toolbar__count">
                    {applyTemplate(resultsSummaryTemplate, {
                      start: rangeStart,
                      end: rangeEnd,
                      total: processedEvents.length,
                    })}
                  </p>

                  <div className="events-status-filter">
                    <ul className="list-wrap">
                      {statusOptions.map((value) => (
                        <li key={`event-status-tab-${value}`}>
                          <button
                            type="button"
                            className={`events-status-filter__btn ${statusFilter === value ? "is-active" : ""}`}
                            onClick={() => toggleStatusFilter(value)}
                          >
                            {value === "all"
                              ? filterAllLabel
                              : value === "upcoming"
                                ? filterUpcomingLabel
                                : filterCompletedLabel}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="event__item-wrap events-listing events-listing--grid">
              <div className="row">
                {loading
                  ? Array.from({ length: EVENTS_PER_PAGE }).map((_, index) => (
                      <div
                        className="col-xl-4 col-md-6"
                        key={`event-skeleton-${index}`}
                      >
                        <div className="event__item event__item--skeleton" aria-hidden>
                          <div className="event__item-thumb" />
                          <div className="event__item-content">
                            <span className="date">&nbsp;</span>
                            <h2 className="title">&nbsp;</h2>
                            <span className="location">&nbsp;</span>
                          </div>
                        </div>
                      </div>
                    ))
                  : paginatedEvents.map(({ event, status }, index) => {
                      const gallery = Array.isArray(event.completion_image_urls)
                        ? event.completion_image_urls
                            .map((item) => toAbsolutePublicUrl(item))
                            .map((item) => (item ? toSizedImageUrl(item, 900, 70) : null))
                            .filter((item): item is string => Boolean(item))
                        : [];
                      const isCompleted = status === "completed";
                      const mainGalleryImage = gallery[0] || null;
                      const openEventDetails = () => openDetails(event);

                      return (
                        <div
                          className="col-xl-4 col-md-6"
                          key={event.id}
                          data-aos="fade-up"
                          data-aos-delay={(index % 3) * 100}
                        >
                          <div
                            className="event__item event__item--interactive"
                            role="button"
                            tabIndex={0}
                            aria-label={`View details for ${event.title}`}
                            onClick={openEventDetails}
                            onKeyDown={(pressed) => {
                              if (pressed.key === "Enter" || pressed.key === " ") {
                                pressed.preventDefault();
                                openEventDetails();
                              }
                            }}
                          >
                            {isCompleted && mainGalleryImage ? (
                              <div className="event__item-thumb event__item-thumb--gallery">
                                <Image src={mainGalleryImage} alt={event.title} />
                                <span className="event__gallery-badge">{gallery.length} {photosSuffix}</span>
                              </div>
                            ) : (
                              <div className="event__item-thumb event__item-thumb--placeholder">
                                <span className="event__placeholder-pill">{EVENT_STATUS_LABELS[status]}</span>
                                <span className="event__placeholder-icon">
                                  <i className="far fa-calendar-check"></i>
                                </span>
                                <p className="event__placeholder-date">{formatEventDate(event.starts_at)}</p>
                              </div>
                            )}
                            <div className="event__item-content">
                              <span className="date">{formatEventDate(event.starts_at)}</span>
                              <h2 className="title">
                                <button type="button" className="event__detail-trigger" onClick={openEventDetails}>
                                  {event.title}
                                </button>
                              </h2>
                              <button
                                type="button"
                                className="location event__detail-trigger event__detail-trigger--location"
                                onClick={openEventDetails}
                              >
                                <i className="fas fa-map-marker-alt"></i>
                                {event.location || locationFallback}
                              </button>
                              <button type="button" className="event__detail-cta" onClick={openEventDetails}>
                                {viewDetailsText}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>

            {!loading && processedEvents.length > EVENTS_PER_PAGE ? (
              <nav className="pagination__wrap mt-30" aria-label="Events pagination">
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
            ) : null}

            {!loading && error ? <p className="dh-live-note dh-live-note--center">{error}</p> : null}
            {!loading && !error && !processedEvents.length ? (
              <p className="dh-live-note dh-live-note--center">
                {emptyStateText}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {selectedEvent ? (
        <div
          className={`event-preview-modal ${isModalClosing ? "is-closing" : "is-open"}`}
          role="presentation"
          onClick={closeDetails}
        >
          <div
            className="event-preview-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedEvent.title} details`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="event-preview-modal__close"
              aria-label={closeLabel}
              onClick={closeDetails}
            >
              <span aria-hidden="true">×</span>
            </button>

            <div className="event-preview-modal__layout">
              <div className="event-preview-modal__media">
                {selectedMainImage ? (
                  <>
                    <div
                      className={`event-preview-modal__hero ${isAutoSlidePaused ? "is-paused" : ""}`}
                      onMouseEnter={() => setIsAutoSlidePaused(true)}
                      onMouseLeave={() => setIsAutoSlidePaused(false)}
                      onFocus={() => setIsAutoSlidePaused(true)}
                      onBlur={() => setIsAutoSlidePaused(false)}
                    >
                      <div
                        className={`event-preview-modal__hero-image ${
                          isActiveImageLoaded ? "is-loaded" : "is-loading"
                        } ${activeImageIndex % 2 === 1 ? "is-pan-alt" : ""} ${
                          previousMainImage ? "is-crossfading" : ""
                        }`}
                      >
                        {!isActiveImageLoaded ? (
                          <span className="event-preview-modal__hero-loader" aria-hidden />
                        ) : null}
                        {previousMainImage ? (
                          <Image
                            src={previousMainImage}
                            alt=""
                            aria-hidden="true"
                            className="event-preview-modal__hero-frame event-preview-modal__hero-frame--prev"
                            loading="eager"
                            decoding="async"
                          />
                        ) : null}
                        <Image
                          key={`${selectedMainImage}-${activeImageIndex}`}
                          src={selectedMainImage}
                          alt={selectedEvent.title}
                          className="event-preview-modal__hero-frame event-preview-modal__hero-frame--current"
                          loading="eager"
                          decoding="async"
                          onLoad={() => {
                            if (!selectedMainImage) return;
                            setLoadedImageMap((current) =>
                              current[selectedMainImage]
                                ? current
                                : { ...current, [selectedMainImage]: true }
                            );
                          }}
                        />
                      </div>
                      {selectedGallery.length > 1 ? (
                        <>
                          <button
                            type="button"
                            className="event-preview-modal__arrow event-preview-modal__arrow--prev"
                            onClick={showPrevImage}
                            aria-label={previousImageLabel}
                          >
                            <span aria-hidden="true" className="event-preview-modal__arrow-glyph">
                              ‹
                            </span>
                          </button>
                          <button
                            type="button"
                            className="event-preview-modal__arrow event-preview-modal__arrow--next"
                            onClick={showNextImage}
                            aria-label={nextImageLabel}
                          >
                            <span aria-hidden="true" className="event-preview-modal__arrow-glyph">
                              ›
                            </span>
                          </button>
                        </>
                      ) : null}
                    </div>

                    {selectedGallery.length > 1 ? (
                      <div
                        className="event-preview-modal__thumbs is-animated"
                        onMouseEnter={() => setIsAutoSlidePaused(true)}
                        onMouseLeave={() => setIsAutoSlidePaused(false)}
                      >
                        {selectedThumbGallery.map((imageUrl, index) => (
                          <button
                            key={`${selectedEvent.id}-image-${index}`}
                            type="button"
                            className={`event-preview-modal__thumb ${index === activeImageIndex ? "is-active" : ""}`}
                            onClick={() => setActiveImageIndex(index)}
                          >
                            <Image src={imageUrl} alt={`${selectedEvent.title} ${index + 1}`} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="event-preview-modal__placeholder">
                    <span className="event-preview-modal__placeholder-pill">
                      {EVENT_STATUS_LABELS[selectedEventStatus]} Event
                    </span>
                    <i className="far fa-calendar-check"></i>
                    <p>{formatEventDate(selectedEvent.starts_at)}</p>
                  </div>
                )}
              </div>

              <aside className="event-preview-modal__info">
                <h3>{selectedEvent.title}</h3>
                <ul className="event-preview-modal__meta">
                  <li>
                    <strong>{startLabel}:</strong> {formatEventDateTime(selectedEvent.starts_at)}
                  </li>
                  <li>
                    <strong>{endLabel}:</strong>{" "}
                    {selectedEvent.ends_at ? formatEventDateTime(selectedEvent.ends_at) : notAvailableText}
                  </li>
                  <li>
                    <strong>{locationLabel}:</strong> {selectedEvent.location || locationFallback}
                  </li>
                  <li>
                    <strong>{statusLabel}:</strong> {EVENT_STATUS_LABELS[selectedEventStatus]}
                  </li>
                </ul>

                {selectedEvent.description ? (
                  <p className="event-preview-modal__summary">{selectedEvent.description}</p>
                ) : null}

                <div className="event-preview-modal__post">
                  <h4>{eventPostTitle}</h4>
                  <p>{selectedEvent.post_body || fallbackPostText}</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default EventsArea;

