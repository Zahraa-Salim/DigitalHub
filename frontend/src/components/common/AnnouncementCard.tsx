import type { CSSProperties } from "react";
import Link from "@/components/common/Link";
import type { PublicAnnouncement } from "@/lib/publicApi";

type AnnouncementTone = "cohort" | "event" | "general";

export type AnnouncementCardProps = {
  title: string;
  body?: string | null;
  cohort_id?: number | null;
  cohort_status?: "coming_soon" | "open" | "running" | "completed" | "cancelled" | "planned" | null;
  event_id?: number | null;
  event_slug?: string | null;
  event_starts_at?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  cta_open_in_new_tab?: boolean | null;
  cohort_name?: string | null;
  program_title?: string | null;
  event_title?: string | null;
  publish_at?: string | null;
  created_at?: string | null;
  tone?: AnnouncementTone;
  fallback_url?: string | null;
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

const resolveAnnouncementMeta = (props: AnnouncementCardProps) => {
  const defaultMeta = (() => {
    if (props.cohort_id) {
      const isOpen = props.cohort_status === "open";
      return {
        tone: "cohort" as AnnouncementTone,
        label: isOpen ? "Open Program" : "Coming Soon",
        href: isOpen ? `/apply?cohortId=${props.cohort_id}` : `/cohorts/${props.cohort_id}`,
        actionLabel: isOpen ? "Apply Now" : "View Program",
        eyebrow: props.program_title || "Program Update",
        note: isOpen ? "Applications are live now." : "Enrollment opens soon.",
        openInNewTab: false,
      };
    }

    if (props.event_id && props.event_slug) {
      return {
        tone: "event" as AnnouncementTone,
        label: "Upcoming Event",
        href: `/events/${props.event_slug}`,
        actionLabel: "View Event",
        eyebrow: props.event_title || "Event Update",
        note: "Save the date and review the agenda.",
        openInNewTab: false,
      };
    }

    return {
      tone: "general" as AnnouncementTone,
      label: "Announcement",
      href: props.fallback_url || "/programs",
      actionLabel: "Learn More",
      eyebrow: "Digital Hub",
      note: "Latest update from Digital Hub.",
      openInNewTab: false,
    };
  })();

  const customCtaUrl = String(props.cta_url || "").trim();
  const customCtaLabel = String(props.cta_label || "").trim();
  if (!customCtaUrl) {
    return defaultMeta;
  }

  return {
    ...defaultMeta,
    href: customCtaUrl,
    actionLabel: customCtaLabel || defaultMeta.actionLabel || "Learn More",
    openInNewTab: Boolean(props.cta_open_in_new_tab),
  };
};

const resolveToneClass = (tone: AnnouncementTone) => `home-announcements__pill home-announcements__pill--${tone}`;

const toneAccent: Record<AnnouncementTone, string> = {
  cohort: "var(--tg-theme-primary, #2563eb)",
  event: "var(--tg-color-purple, #7c3aed)",
  general: "var(--tg-theme-secondary, #FFC224)",
};

const tonePillBg: Record<AnnouncementTone, string> = {
  cohort: "rgba(37,99,235,0.08)",
  event: "rgba(124,58,237,0.08)",
  general: "var(--tg-theme-secondary, #FFC224)",
};

const tonePillColor: Record<AnnouncementTone, string> = {
  cohort: "#2563eb",
  event: "#7c3aed",
  general: "var(--tg-heading-color, #141109)",
};

export function resolveAnnouncementCardProps(item: PublicAnnouncement): AnnouncementCardProps {
  const tone: AnnouncementTone = item.cohort_id ? "cohort" : item.event_id ? "event" : "general";
  const fallbackUrl = item.event_slug
    ? `/events/${item.event_slug}`
    : item.cohort_id
      ? `/cohorts/${item.cohort_id}`
      : "/events#announcements";

  return {
    title: item.title,
    body: item.body,
    cohort_id: item.cohort_id,
    cohort_status: item.cohort_status,
    event_id: item.event_id,
    event_slug: item.event_slug,
    event_starts_at: item.event_starts_at,
    cta_label: item.cta_label,
    cta_url: item.cta_url,
    cta_open_in_new_tab: item.cta_open_in_new_tab,
    cohort_name: item.cohort_name,
    program_title: item.program_title,
    event_title: item.event_title,
    publish_at: item.publish_at,
    created_at: item.created_at,
    tone,
    fallback_url: fallbackUrl,
  };
}

export function AnnouncementCard(props: AnnouncementCardProps) {
  const meta = resolveAnnouncementMeta(props);
  const tone = props.tone ?? meta.tone;
  const displayDate = formatAnnouncementDate(props.publish_at || props.created_at);
  const secondaryDate = formatAnnouncementDate(props.event_starts_at || null);
  const href = String(meta.href || props.fallback_url || "").trim();
  const accent = toneAccent[tone];
  const pillBg = tonePillBg[tone];
  const pillColor = tonePillColor[tone];
  const ctaStyle =
    tone === "general"
      ? {
          background: "var(--tg-theme-secondary, #FFC224)",
          borderColor: "#141109",
          color: "var(--tg-heading-color, #141109)",
          boxShadow: "4px 6px 0 0 #3d3d3d",
        }
      : { color: pillColor };
  const dateLabel = secondaryDate ? `Starts ${secondaryDate}` : displayDate || meta.note;

  return (
    <article
      className="home-announcements__banner"
      style={{ "--banner-accent": accent } as CSSProperties}
    >
      <span className="home-announcements__accent-bar" aria-hidden="true" />

      <div className="home-announcements__banner-main">
        <div className="home-announcements__banner-top">
          <span className={resolveToneClass(tone)} style={{ background: pillBg, color: pillColor }}>
            {meta.label}
          </span>
          <span className="home-announcements__eyebrow">{meta.eyebrow}</span>
        </div>

        <h3 className="home-announcements__banner-title">{props.title}</h3>
        {props.body ? <p className="home-announcements__banner-body">{props.body}</p> : null}
      </div>

      <div className="home-announcements__banner-side">
        {dateLabel ? <span className="home-announcements__banner-date">{dateLabel}</span> : null}
        {href ? (
          <Link
            to={href}
            className="home-announcements__banner-cta"
            style={ctaStyle}
            target={meta.openInNewTab ? "_blank" : undefined}
            rel={meta.openInNewTab ? "noopener noreferrer" : undefined}
          >
            <span>{meta.actionLabel}</span>
            <i className="flaticon-arrow-right" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
