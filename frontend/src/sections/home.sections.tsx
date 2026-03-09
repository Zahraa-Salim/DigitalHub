// File: src/sections/home.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
"use client";

import { Fragment, useEffect, useMemo, useState, type ReactElement } from "react";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import HomeOneAbout from "@/components/homes/home-one/About";
import HomeOneAnnouncements from "@/components/homes/home-one/Announcements";
import HomeOneBanner from "@/components/homes/home-one/Banner";
import HomeOneCourseArea from "@/components/homes/home-one/CourseArea";
import HomeOneFeaturedParticipants from "@/components/homes/home-one/FeaturedParticipants";
import HomeOneFeatures from "@/components/homes/home-one/Features";
import HomeOneInstructor from "@/components/homes/home-one/Instructor";
import HomeOneInstructorTwo from "@/components/homes/home-one/InstructorTwo";
import HomeOneNewsletter from "@/components/homes/home-one/Newsletter";
import { getPublicHomeData, type PublicHomeData } from "@/lib/publicApi";

type HomeSectionId =
  | "banner"
  | "announcements"
  | "about"
  | "programs"
  | "featured_participants"
  | "newsletter"
  | "instructors"
  | "features"
  | "apply_cta";

type HomeSectionRenderer = {
  id: HomeSectionId;
  aliases: string[];
  render: (content: Record<string, unknown> | null) => ReactElement;
};

const HOME_SECTION_RENDERERS: HomeSectionRenderer[] = [
  {
    id: "banner",
    aliases: ["hero", "banner", "home_banner"],
    render: (content) => <HomeOneBanner content={content} />,
  },
  {
    id: "announcements",
    aliases: ["announcements", "announcement_feed", "home_announcements"],
    render: (content) => <HomeOneAnnouncements content={content} />,
  },
  {
    id: "about",
    aliases: ["about", "home_about"],
    render: (content) => <HomeOneAbout content={content} />,
  },
  {
    id: "programs",
    aliases: ["programs", "courses", "cohorts", "course_area"],
    render: (content) => <HomeOneCourseArea content={content} />,
  },
  {
    id: "featured_participants",
    aliases: ["featured_participants", "featured_participant", "participants_featured"],
    render: (content) => <HomeOneFeaturedParticipants content={content} />,
  },
  {
    id: "newsletter",
    aliases: ["newsletter", "subscribe"],
    render: (content) => <HomeOneNewsletter content={content} />,
  },
  {
    id: "instructors",
    aliases: ["instructors", "team", "featured_students"],
    render: (content) => <HomeOneInstructor content={content} />,
  },
  {
    id: "features",
    aliases: ["features", "benefits", "journey"],
    render: (content) => <HomeOneFeatures content={content} />,
  },
  {
    id: "apply_cta",
    aliases: ["apply_cta", "cta", "apply"],
    render: (content) => <HomeOneInstructorTwo content={content} />,
  },
];

const FALLBACK_SECTION_ORDER: HomeSectionId[] = HOME_SECTION_RENDERERS.map((item) => item.id);
const SECTION_PRIORITY = new Map<HomeSectionId, number>(
  FALLBACK_SECTION_ORDER.map((id, index) => [id, index])
);

const SECTION_BY_ID = new Map<HomeSectionId, HomeSectionRenderer>(
  HOME_SECTION_RENDERERS.map((item) => [item.id, item])
);

const SECTION_ALIAS_MAP = HOME_SECTION_RENDERERS.reduce((map, item) => {
  item.aliases.forEach((alias) => {
    map.set(alias, item.id);
  });
  return map;
}, new Map<string, HomeSectionId>());

const normalizeSectionKey = (value: string | null | undefined) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const toCmsRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toSafeNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const sortHomeSections = (sections: PublicHomeData["sections"]) => {
  if (!Array.isArray(sections)) return [];

  return [...sections].sort((a, b) => {
    const sortDiff = toSafeNumber(a.sort_order) - toSafeNumber(b.sort_order);
    if (sortDiff !== 0) return sortDiff;

    const aId = SECTION_ALIAS_MAP.get(normalizeSectionKey(a.key));
    const bId = SECTION_ALIAS_MAP.get(normalizeSectionKey(b.key));
    const aPriority = aId ? toSafeNumber(SECTION_PRIORITY.get(aId), 999) : 999;
    const bPriority = bId ? toSafeNumber(SECTION_PRIORITY.get(bId), 999) : 999;
    const priorityDiff = aPriority - bPriority;
    if (priorityDiff !== 0) return priorityDiff;

    return toSafeNumber(a.id) - toSafeNumber(b.id);
  });
};

const resolveHomeSectionOrder = (sections: PublicHomeData["sections"] | undefined) => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return FALLBACK_SECTION_ORDER;
  }

  const sorted = sortHomeSections(sections);
  const referenced = new Set<HomeSectionId>();
  const enabled = new Set<HomeSectionId>();
  const ordered: HomeSectionId[] = [];

  for (const section of sorted) {
    const sectionId = SECTION_ALIAS_MAP.get(normalizeSectionKey(section.key));
    if (!sectionId) continue;
    referenced.add(sectionId);
    if (!section.is_enabled || enabled.has(sectionId)) continue;
    enabled.add(sectionId);
    ordered.push(sectionId);
  }

  for (const fallbackId of FALLBACK_SECTION_ORDER) {
    if (enabled.has(fallbackId) || referenced.has(fallbackId)) continue;
    ordered.push(fallbackId);
  }

  return ordered.length ? ordered : FALLBACK_SECTION_ORDER;
};

const enforceHomeSectionOrder = (order: HomeSectionId[]) => {
  const dedupedOrder: HomeSectionId[] = [];
  for (const sectionId of order) {
    if (dedupedOrder.includes(sectionId)) continue;
    dedupedOrder.push(sectionId);
  }

  const announcementsIndex = dedupedOrder.indexOf("announcements");
  const bannerIndex = dedupedOrder.indexOf("banner");

  if (announcementsIndex >= 0 && bannerIndex >= 0 && announcementsIndex !== bannerIndex + 1) {
    dedupedOrder.splice(announcementsIndex, 1);
    const nextBannerIndex = dedupedOrder.indexOf("banner");
    const insertionIndex = Math.min(nextBannerIndex + 1, dedupedOrder.length);
    dedupedOrder.splice(insertionIndex, 0, "announcements");
  }

  return dedupedOrder;
};

const resolveSectionContentMap = (sections: PublicHomeData["sections"] | undefined) => {
  const contentMap: Partial<Record<HomeSectionId, Record<string, unknown> | null>> = {};
  if (!Array.isArray(sections) || sections.length === 0) {
    return contentMap;
  }

  const sorted = sortHomeSections(sections);

  for (const section of sorted) {
    const sectionId = SECTION_ALIAS_MAP.get(normalizeSectionKey(section.key));
    if (!sectionId) continue;
    if (sectionId in contentMap) continue;
    contentMap[sectionId] = toCmsRecord(section.content);
  }

  return contentMap;
};

export const HomeOne = () => {
  const [sections, setSections] = useState<PublicHomeData["sections"]>([]);

  useEffect(() => {
    let active = true;

    const loadHomeSections = async () => {
      try {
        const data = await getPublicHomeData();
        if (!active) return;
        setSections(Array.isArray(data.sections) ? data.sections : []);
      } catch {
        if (!active) return;
        setSections([]);
      }
    };

    void loadHomeSections();

    return () => {
      active = false;
    };
  }, []);

  const orderedSectionIds = useMemo(
    () => enforceHomeSectionOrder(resolveHomeSectionOrder(sections)),
    [sections]
  );
  const sectionContentMap = useMemo(() => resolveSectionContentMap(sections), [sections]);

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        {orderedSectionIds.map((sectionId) => {
          const renderer = SECTION_BY_ID.get(sectionId);
          if (!renderer) return null;
          return (
            <Fragment key={sectionId}>
              {renderer.render(sectionContentMap[sectionId] ?? null)}
            </Fragment>
          );
        })}
      </main>
      <FooterOne />
    </>
  );
};

