import { useEffect, useMemo, useState } from "react";
import Link from "@/components/common/Link";
import { getCmsNumber } from "@/lib/cmsContent";
import { listPublicAnnouncements, type PublicAnnouncement } from "@/lib/publicApi";
import { PulseDots } from "../../PulseDots";
import { EditableSpan } from "../EditableSpan";

type AnnouncementsEditorProps = {
  content?: Record<string, unknown> | null;
  sectionId: number;
};

type AnnouncementTone = "cohort" | "event" | "general";

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
      label: isOpen ? "Open Program" : "Coming Soon",
      href: isOpen ? `/apply?cohortId=${item.cohort_id}` : `/programs/${item.cohort_id}`,
      actionLabel: isOpen ? "Apply Now" : "View Program",
      eyebrow: item.program_title || "Program Update",
      note: isOpen ? "Applications are live now." : "Enrollment opens soon.",
      openInNewTab: false,
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
      openInNewTab: false,
    };
  }

  return {
    tone: "general" as AnnouncementTone,
    label: "Announcement",
    href: "/programs",
    actionLabel: "Learn More",
    eyebrow: "Digital Hub",
    note: "Latest update from Digital Hub.",
    openInNewTab: false,
  };
};

const toneAccent: Record<AnnouncementTone, string> = {
  cohort: "var(--tg-theme-primary, #2563eb)",
  event: "var(--tg-color-purple, #7c3aed)",
  general: "var(--tg-theme-secondary, #FFC224)",
};

const tonePillBg: Record<AnnouncementTone, string> = {
  cohort: "rgba(37,99,235,0.08)",
  event: "rgba(124,58,237,0.08)",
  general: "rgba(255,194,36,0.16)",
};

const tonePillColor: Record<AnnouncementTone, string> = {
  cohort: "#2563eb",
  event: "#7c3aed",
  general: "#9A6800",
};

const PREVIEW_FALLBACKS = [
  {
    id: "preview-announcement-1",
    title: "New program applications are now open",
    body: "Explore the latest cohort openings and submit your application directly from the website.",
    meta: {
      tone: "cohort" as AnnouncementTone,
      label: "Open Program",
      href: "/apply",
      actionLabel: "Apply Now",
      eyebrow: "Digital Hub",
      note: "Applications are live now.",
      openInNewTab: false,
    },
    displayDate: "Today",
    secondaryDate: "",
  },
  {
    id: "preview-announcement-2",
    title: "Upcoming community event announced",
    body: "Join the next Digital Hub event to meet the team, review projects, and ask questions.",
    meta: {
      tone: "event" as AnnouncementTone,
      label: "Upcoming Event",
      href: "/events",
      actionLabel: "View Event",
      eyebrow: "Community",
      note: "Save the date and review the agenda.",
      openInNewTab: false,
    },
    displayDate: "This week",
    secondaryDate: "",
  },
] as const;

const AnnouncementsEditor = ({ content, sectionId }: AnnouncementsEditorProps) => {
  const [items, setItems] = useState<PublicAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const cardsLimit = Math.trunc(getCmsNumber(content, ["limit", "card_limit", "items_limit"], 6, 1, 24));

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await listPublicAnnouncements({ page: 1, limit: 200, sortBy: "publish_at", order: "desc" });
        if (!active) return;
        setItems(Array.isArray(rows) ? rows.filter((row) => Boolean(row?.title)) : []);
      } catch {
        if (!active) return;
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const banners = useMemo(
    () =>
      items.slice(0, cardsLimit).map((item) => ({
        ...item,
        meta: resolveAnnouncementMeta(item),
        displayDate: formatAnnouncementDate(item.publish_at || item.created_at),
        secondaryDate: formatAnnouncementDate(item.event_starts_at || null),
      })),
    [cardsLimit, items],
  );

  const visibleBanners = banners.length ? banners : PREVIEW_FALLBACKS;

  return (
    <section className="home-announcements section-py-80">
      <div className="container">
        <div className="home-announcements__heading">
          <EditableSpan sectionId={sectionId} field="subtitle" fallback="Latest Updates" tag="span" className="sub-title" />
          <EditableSpan sectionId={sectionId} field="title" fallback="What Is Happening At The Digital Hub" tag="h2" className="title" />
        </div>

        <div className="home-announcements__list">
          {visibleBanners.map((item, index) => {
            const accent = toneAccent[item.meta.tone];
            const pillBg = tonePillBg[item.meta.tone];
            const pillColor = tonePillColor[item.meta.tone];
            const dateLabel = item.secondaryDate ? `Starts ${item.secondaryDate}` : item.displayDate || item.meta.note;

            return (
              <article
                key={item.id}
                className="home-announcements__banner"
                style={{ "--banner-accent": accent } as React.CSSProperties}
              >
                <span className="home-announcements__accent-bar" aria-hidden="true" />

                <div className="home-announcements__banner-main">
                  <div className="home-announcements__banner-top">
                    <span className="home-announcements__pill" style={{ background: pillBg, color: pillColor }}>
                      {item.meta.label}
                    </span>
                    <span className="home-announcements__eyebrow">{item.meta.eyebrow}</span>
                  </div>
                  <h3 className="home-announcements__banner-title">{item.title}</h3>
                  {item.body ? <p className="home-announcements__banner-body">{item.body}</p> : null}
                </div>

                <div className="home-announcements__banner-side">
                  {dateLabel ? <span className="home-announcements__banner-date">{dateLabel}</span> : null}
                  <Link
                    to={item.meta.href}
                    className="home-announcements__banner-cta"
                    style={{ color: pillColor }}
                    target={item.meta.openInNewTab ? "_blank" : undefined}
                    rel={item.meta.openInNewTab ? "noopener noreferrer" : undefined}
                  >
                    <span>{item.meta.actionLabel}</span>
                    <i className="flaticon-arrow-right" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
        {loading ? (
          <div style={{ marginTop: "0.75rem" }}>
            <PulseDots layout="inline" label="Loading live announcements for preview" />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AnnouncementsEditor;
