// File: frontend/src/components/inner-pages/events/EventDetailsArea.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { API_BASE_URL, getPublicEventBySlug, type PublicEvent } from "@/lib/publicApi";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsString } from "@/lib/cmsContent";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

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

const formatEventDateTime = (value?: string | null) => {
  if (!value) return "N/A";
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

const EventDetailsArea = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = useCmsPage("event_details");
  const content = page?.content ?? null;
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const eventNotFoundText = getCmsString(content, ["error_not_found_text", "errorNotFoundText"], "Event not found.");
  const eventLoadErrorText = getCmsString(content, ["error_load_text", "errorLoadText"], "Unable to load this event right now.");
  const backToEventsText = getCmsString(content, ["back_to_events_text", "backToEventsText"], "Back to Events");
  const allEventsText = getCmsString(content, ["all_events_text", "allEventsText"], "All Events");
  const previousImageLabel = getCmsString(content, ["previous_image_label", "previousImageLabel"], "Previous image");
  const nextImageLabel = getCmsString(content, ["next_image_label", "nextImageLabel"], "Next image");
  const completedEventLabel = getCmsString(content, ["completed_event_label", "completedEventLabel"], "Completed Event");
  const upcomingEventLabel = getCmsString(content, ["upcoming_event_label", "upcomingEventLabel"], "Upcoming Event");
  const statusCompletedLabel = getCmsString(content, ["status_completed_label", "statusCompletedLabel"], "Completed");
  const statusUpcomingLabel = getCmsString(content, ["status_upcoming_label", "statusUpcomingLabel"], "Upcoming");
  const startLabel = getCmsString(content, ["start_label", "startLabel"], "Start");
  const endLabel = getCmsString(content, ["end_label", "endLabel"], "End");
  const locationLabel = getCmsString(content, ["location_label", "locationLabel"], "Location");
  const locationFallback = getCmsString(content, ["location_fallback", "locationFallback"], "The Digital Hub");
  const eventPostTitle = getCmsString(content, ["event_post_title", "eventPostTitle"], "Event Post");
  const eventPostFallbackText = getCmsString(
    content,
    ["event_post_fallback_text", "eventPostFallbackText"],
    "Details for this event will be published soon.",
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!slug) {
        setError(eventNotFoundText);
        setEvent(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const payload = await getPublicEventBySlug(slug);
        if (!active) return;
        setEvent(payload);
        setError(null);
      } catch {
        if (!active) return;
        setEvent(null);
        setError(eventLoadErrorText);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [slug, eventLoadErrorText, eventNotFoundText]);

  const gallery = useMemo(() => {
    if (!event?.is_done || !Array.isArray(event.completion_image_urls)) return [];
    return event.completion_image_urls
      .map((value) => toAbsolutePublicUrl(value))
      .filter((value): value is string => Boolean(value));
  }, [event]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [slug, gallery.length]);

  const hasGallery = gallery.length > 0;
  const activeImage = hasGallery ? gallery[Math.min(activeImageIndex, gallery.length - 1)] : null;

  const goPrev = () => {
    if (!hasGallery) return;
    setActiveImageIndex((current) => (current - 1 + gallery.length) % gallery.length);
  };

  const goNext = () => {
    if (!hasGallery) return;
    setActiveImageIndex((current) => (current + 1) % gallery.length);
  };

  return (
    <section className="event-detail section-py-120">
      <div className="container">
        {loading ? (
          <div className="event-detail__skeleton" aria-hidden>
            <div className="event-detail__skeleton-media" />
            <div className="event-detail__skeleton-info" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="event-detail__error">
            <p>{error}</p>
            <Link to="/events" className="btn btn-two">
              {backToEventsText}
            </Link>
          </div>
        ) : null}

        {!loading && !error && event ? (
          <div className="event-detail__layout">
            <div className="event-detail__media">
              {activeImage ? (
                <>
                  <div className="event-detail__slide-main">
                    <Image src={activeImage} alt={event.title} />
                    {gallery.length > 1 ? (
                      <>
                        <button
                          type="button"
                          className="event-detail__slide-arrow event-detail__slide-arrow--prev"
                          onClick={goPrev}
                          aria-label={previousImageLabel}
                        >
                          <i className="fas fa-angle-left"></i>
                        </button>
                        <button
                          type="button"
                          className="event-detail__slide-arrow event-detail__slide-arrow--next"
                          onClick={goNext}
                          aria-label={nextImageLabel}
                        >
                          <i className="fas fa-angle-right"></i>
                        </button>
                      </>
                    ) : null}
                  </div>
                  {gallery.length > 1 ? (
                    <div className="event-detail__thumbs">
                      {gallery.map((imageUrl, index) => (
                        <button
                          type="button"
                          key={`${event.id}-thumb-${index}`}
                          className={`event-detail__thumb ${index === activeImageIndex ? "is-active" : ""}`}
                          onClick={() => setActiveImageIndex(index)}
                        >
                          <Image src={imageUrl} alt={`${event.title} ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="event-detail__placeholder">
                  <span className="event-detail__placeholder-pill">
                    {event.is_done ? completedEventLabel : upcomingEventLabel}
                  </span>
                  <i className="far fa-calendar-check"></i>
                  <p>{formatEventDateTime(event.starts_at)}</p>
                </div>
              )}
            </div>

            <aside className="event-detail__info">
              <div className="event-detail__status">
                <span className={`event-detail__status-badge ${event.is_done ? "is-done" : "is-upcoming"}`}>
                  {event.is_done ? statusCompletedLabel : statusUpcomingLabel}
                </span>
                <Link to="/events" className="event-detail__back-link">
                  <i className="fas fa-arrow-left"></i> {allEventsText}
                </Link>
              </div>

              <h2 className="event-detail__title">{event.title}</h2>

              <div className="event-detail__meta">
                <p>
                  <strong>{startLabel}:</strong> {formatEventDateTime(event.starts_at)}
                </p>
                <p>
                  <strong>{endLabel}:</strong> {formatEventDateTime(event.ends_at)}
                </p>
                <p>
                  <strong>{locationLabel}:</strong> {event.location || locationFallback}
                </p>
              </div>

              {event.description ? <p className="event-detail__summary">{event.description}</p> : null}

              <div className="event-detail__post">
                <h4>{eventPostTitle}</h4>
                <p>{event.post_body || eventPostFallbackText}</p>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default EventDetailsArea;
