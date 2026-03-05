"use client";

import Image from "@/components/common/Image";
import { API_BASE_URL, listPublicEvents, type PublicEvent } from "@/lib/publicApi";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReactPaginate from "react-paginate";

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

const MODAL_SLIDE_AUTOPLAY_MS = 3200;
const EVENTS_PER_PAGE = 6;

type EventStatusFilter = "all" | "upcoming" | "live" | "completed";
type EventSortValue = "date_asc" | "date_desc" | "title_asc" | "title_desc" | "status";

const EVENT_STATUS_LABELS: Record<Exclude<EventStatusFilter, "all">, string> = {
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
};

const EVENT_STATUS_ORDER: EventStatusFilter[] = ["all", "upcoming", "completed"];
const EVENT_SORT_VALUES: EventSortValue[] = ["date_asc", "date_desc", "title_asc", "title_desc", "status"];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isAutoSlidePaused, setIsAutoSlidePaused] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("all");
  const [sortValue, setSortValue] = useState<EventSortValue>("date_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedImageMap, setLoadedImageMap] = useState<Record<string, boolean>>({});
  const [previousMainImage, setPreviousMainImage] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const imageTransitionTimerRef = useRef<number | null>(null);
  const previousMainImageRef = useRef<string | null>(null);

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
        setError("Unable to load events right now.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sortFromQuery = searchParams.get("sort");
    const parsedSort: EventSortValue = EVENT_SORT_VALUES.includes(sortFromQuery as EventSortValue)
      ? (sortFromQuery as EventSortValue)
      : "date_asc";

    const statusFromQuery = searchParams.get("status");
    const parsedStatus: EventStatusFilter = EVENT_STATUS_ORDER.includes(statusFromQuery as EventStatusFilter)
      ? (statusFromQuery as EventStatusFilter)
      : "all";

    const pageFromQuery = Number.parseInt(searchParams.get("page") || "1", 10);
    const parsedPage = Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1;

    setSortValue((current) => (current === parsedSort ? current : parsedSort));
    setStatusFilter((current) => (current === parsedStatus ? current : parsedStatus));
    setCurrentPage((current) => (current === parsedPage ? current : parsedPage));
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

      switch (sortValue) {
        case "date_desc":
          return (Number.isNaN(bStart) ? 0 : bStart) - (Number.isNaN(aStart) ? 0 : aStart);
        case "title_asc":
          return String(a.event.title || "").localeCompare(String(b.event.title || ""));
        case "title_desc":
          return String(b.event.title || "").localeCompare(String(a.event.title || ""));
        case "status": {
          const rank: Record<Exclude<EventStatusFilter, "all">, number> = {
            live: 0,
            upcoming: 1,
            completed: 2,
          };
          if (rank[a.status] === rank[b.status]) {
            return (Number.isNaN(aStart) ? 0 : aStart) - (Number.isNaN(bStart) ? 0 : bStart);
          }
          return rank[a.status] - rank[b.status];
        }
        case "date_asc":
        default:
          return (Number.isNaN(aStart) ? 0 : aStart) - (Number.isNaN(bStart) ? 0 : bStart);
      }
    });

    return filtered;
  }, [eventRows, statusFilter, sortValue]);

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
    const next = new URLSearchParams();
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (sortValue !== "date_asc") next.set("sort", sortValue);
    if (currentPage > 1) next.set("page", String(currentPage));

    const nextString = next.toString();
    if (nextString !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [statusFilter, sortValue, currentPage, searchParams, setSearchParams]);

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

// File: src/components/inner-pages/events/EventsArea.tsx
// Purpose: UI component responsible for rendering part of the interface (inner-pages/events/EventsArea.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";

type EventCard = {
  id: number;
  title: string;
  dateLabel: string;
  location: string;
  image: string;
};

const events: EventCard[] = [
  {
    id: 1,
    title: "AI Product Sprint and Demo Day",
    dateLabel: "Mar 06, 2026",
    location: "Beirut Digital District",
    image: "/assets/img/events/event_thumb01.jpg",
  },
  {
    id: 2,
    title: "Frontend Performance Masterclass",
    dateLabel: "Mar 14, 2026",
    location: "The Digital Hub Campus",
    image: "/assets/img/events/event_thumb02.jpg",
  },
  {
    id: 3,
    title: "Data and Automation for Teams",
    dateLabel: "Mar 21, 2026",
    location: "Online Live Session",
    image: "/assets/img/events/event_thumb03.jpg",
  },
  {
    id: 4,
    title: "Career Growth Night for Developers",
    dateLabel: "Apr 03, 2026",
    location: "Downtown, Beirut",
    image: "/assets/img/events/event_thumb04.jpg",
  },
  {
    id: 5,
    title: "Startup Pitch Clinic and Mentorship",
    dateLabel: "Apr 17, 2026",
    location: "The Digital Hub Campus",
    image: "/assets/img/events/event_thumb05.jpg",
  },
  {
    id: 6,
    title: "Cybersecurity Essentials Bootcamp",
    dateLabel: "Apr 29, 2026",
    location: "Hybrid Event",
    image: "/assets/img/events/event_thumb06.jpg",
  },
];

const EventsArea = () => {
  return (
    <section className="event__area section-py-120">
      <div className="container">
        <div className="section__title-wrap mb-35">
          <div className="row align-items-end">
            <div className="col-lg-8">
              <div className="section__title">
                <span className="sub-title">Events</span>
                <h2 className="title">
                  Community Moments at <span>The Digital Hub</span>
                <span className="sub-title">Upcoming Events</span>
                <h2 className="title">
                  Join the next sessions at <span>The Digital Hub</span>
                </h2>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="section__content">
                <p>
                  The Digital Hub is UNRWA's learning-to-employment platform where youth build
                  digital skills, ship real projects, and grow through mentors, cohorts, and
                  community events.
                  Workshops, talks, and hands-on learning experiences curated for
                  participants, teams, and professionals.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="events-controls">
              <div className="people-toolbar events-toolbar">
                <p className="people-toolbar__count events-toolbar__count">
                  Showing {rangeStart}-{rangeEnd} Of {processedEvents.length} Results
                </p>

                <div className="people-toolbar__sort events-toolbar__sort">
                  <span>Sort By:</span>
                  <select
                    aria-label="Sort events"
                    value={sortValue}
                    onChange={(event) => {
                      setSortValue(event.target.value as EventSortValue);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="date_asc">Default sorting</option>
                    <option value="date_desc">Date (Latest)</option>
                    <option value="title_asc">Title (A-Z)</option>
                    <option value="title_desc">Title (Z-A)</option>
                    <option value="status">Status (Live, Upcoming, Completed)</option>
                  </select>
                </div>
              </div>

              <div className="events-status-filter">
                <ul className="list-wrap">
                  {statusOptions.map((value) => (
                    <li key={`event-status-tab-${value}`}>
                      <button
                        type="button"
                        className={`events-status-filter__btn ${statusFilter === value ? "is-active" : ""}`}
                        onClick={() => toggleStatusFilter(value)}
                      >
                        {value === "all" ? "All" : EVENT_STATUS_LABELS[value]}
                      </button>
                    </li>
                  ))}
                </ul>
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
                                <span className="event__gallery-badge">{gallery.length} photos</span>
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
                                {event.location || "The Digital Hub"}
                              </button>
                              <button type="button" className="event__detail-cta" onClick={openEventDetails}>
                                View Details
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
                No events match the selected filters.
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
              aria-label="Close details"
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
                            aria-label="Previous image"
                          >
                            <span aria-hidden="true" className="event-preview-modal__arrow-glyph">
                              ‹
                            </span>
                          </button>
                          <button
                            type="button"
                            className="event-preview-modal__arrow event-preview-modal__arrow--next"
                            onClick={showNextImage}
                            aria-label="Next image"
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
                    <strong>Start:</strong> {formatEventDateTime(selectedEvent.starts_at)}
                  </li>
                  <li>
                    <strong>End:</strong>{" "}
                    {selectedEvent.ends_at ? formatEventDateTime(selectedEvent.ends_at) : "N/A"}
                  </li>
                  <li>
                    <strong>Location:</strong> {selectedEvent.location || "The Digital Hub"}
                  </li>
                  <li>
                    <strong>Status:</strong> {EVENT_STATUS_LABELS[selectedEventStatus]}
                  </li>
                </ul>

                {selectedEvent.description ? (
                  <p className="event-preview-modal__summary">{selectedEvent.description}</p>
                ) : null}

                <div className="event-preview-modal__post">
                  <h4>Event Post</h4>
                  <p>{selectedEvent.post_body || "Details for this event will be published soon."}</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
        <div className="event__item-wrap">
          <div className="row">
            {events.map((event, index) => (
              <div
                className="col-lg-4 col-md-6"
                key={event.id}
                data-aos="fade-up"
                data-aos-delay={(index % 3) * 100}
              >
                <div className="event__item">
                  <div className="event__item-thumb">
                    <Image src={event.image} alt={event.title} />
                  </div>
                  <div className="event__item-content">
                    <span className="date">{event.dateLabel}</span>
                    <h2 className="title">
                      <Link to="/contact">{event.title}</Link>
                    </h2>
                    <Link to="/contact" className="location">
                      <i className="fas fa-map-marker-alt"></i>
                      {event.location}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventsArea;
