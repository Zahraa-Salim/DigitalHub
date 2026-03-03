"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { API_BASE_URL, getPublicEventBySlug, type PublicEvent } from "@/lib/publicApi";
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
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!slug) {
        setError("Event not found.");
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
        setError("Unable to load this event right now.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [slug]);

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
              Back to Events
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
                          aria-label="Previous image"
                        >
                          <i className="fas fa-angle-left"></i>
                        </button>
                        <button
                          type="button"
                          className="event-detail__slide-arrow event-detail__slide-arrow--next"
                          onClick={goNext}
                          aria-label="Next image"
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
                    {event.is_done ? "Completed Event" : "Upcoming Event"}
                  </span>
                  <i className="far fa-calendar-check"></i>
                  <p>{formatEventDateTime(event.starts_at)}</p>
                </div>
              )}
            </div>

            <aside className="event-detail__info">
              <div className="event-detail__status">
                <span className={`event-detail__status-badge ${event.is_done ? "is-done" : "is-upcoming"}`}>
                  {event.is_done ? "Completed" : "Upcoming"}
                </span>
                <Link to="/events" className="event-detail__back-link">
                  <i className="fas fa-arrow-left"></i> All Events
                </Link>
              </div>

              <h2 className="event-detail__title">{event.title}</h2>

              <div className="event-detail__meta">
                <p>
                  <strong>Start:</strong> {formatEventDateTime(event.starts_at)}
                </p>
                <p>
                  <strong>End:</strong> {formatEventDateTime(event.ends_at)}
                </p>
                <p>
                  <strong>Location:</strong> {event.location || "The Digital Hub"}
                </p>
              </div>

              {event.description ? <p className="event-detail__summary">{event.description}</p> : null}

              <div className="event-detail__post">
                <h4>Event Post</h4>
                <p>{event.post_body || "Details for this event will be published soon."}</p>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default EventDetailsArea;

