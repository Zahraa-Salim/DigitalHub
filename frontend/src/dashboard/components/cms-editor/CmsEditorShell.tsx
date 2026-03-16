import type { ComponentType, ReactElement } from "react";
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
import { SectionWrapper } from "./SectionWrapper";
import type { EditorSection, EditTarget } from "../../hooks/useCmsEditor";

type SectionRenderer = {
  aliases: string[];
  component: ComponentType<{ content?: Record<string, unknown> | null }>;
  fields: Array<{ field: string; label: string; type: EditTarget["type"] }>;
};

const SECTION_RENDERERS: SectionRenderer[] = [
  {
    aliases: ["hero", "banner", "home_banner"],
    component: HomeOneBanner,
    fields: [
      { field: "headline_highlight", label: "Headline", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
      { field: "cta_text", label: "CTA Text", type: "text" },
      { field: "cta_link", label: "CTA Link", type: "text" },
      { field: "background_image_url", label: "Background Image", type: "image" },
    ],
  },
  {
    aliases: ["announcements", "announcement_feed", "home_announcements"],
    component: HomeOneAnnouncements,
    fields: [
      { field: "subtitle", label: "Subtitle", type: "text" },
      { field: "title", label: "Title", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    aliases: ["about", "home_about"],
    component: HomeOneAbout,
    fields: [
      { field: "subtitle", label: "Subtitle", type: "text" },
      { field: "title", label: "Title", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
      { field: "main_image_url", label: "Main Image", type: "image" },
    ],
  },
  {
    aliases: ["programs", "courses", "cohorts", "course_area"],
    component: HomeOneCourseArea,
    fields: [
      { field: "subtitle", label: "Subtitle", type: "text" },
      { field: "title", label: "Title", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
      { field: "more_button_text", label: "Button Text", type: "text" },
    ],
  },
  {
    aliases: ["featured_participants", "featured_participant", "participants_featured"],
    component: HomeOneFeaturedParticipants,
    fields: [
      { field: "subtitle", label: "Subtitle", type: "text" },
      { field: "title", label: "Title", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    aliases: ["newsletter", "subscribe"],
    component: HomeOneNewsletter,
    fields: [
      { field: "title_prefix", label: "Title Prefix", type: "text" },
      { field: "title_highlight", label: "Title Highlight", type: "text" },
      { field: "button_text", label: "Button Text", type: "text" },
      { field: "main_image_url", label: "Main Image", type: "image" },
    ],
  },
  {
    aliases: ["instructors", "team", "featured_students"],
    component: HomeOneInstructor,
    fields: [
      { field: "subtitle", label: "Subtitle", type: "text" },
      { field: "title", label: "Title", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
      { field: "cta_text", label: "CTA Text", type: "text" },
    ],
  },
  {
    aliases: ["features", "benefits", "journey"],
    component: HomeOneFeatures,
    fields: [
      { field: "subtitle", label: "Subtitle", type: "text" },
      { field: "title", label: "Title", type: "text" },
      { field: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    aliases: ["apply_cta", "cta", "apply"],
    component: HomeOneInstructorTwo,
    fields: [
      { field: "left.title", label: "Left Title", type: "text" },
      { field: "left.description", label: "Left Description", type: "textarea" },
      { field: "right.title", label: "Right Title", type: "text" },
      { field: "right.description", label: "Right Description", type: "textarea" },
    ],
  },
];

const normalizeKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const SECTION_MAP = SECTION_RENDERERS.reduce<Record<string, SectionRenderer>>((map, entry) => {
  entry.aliases.forEach((alias) => {
    map[normalizeKey(alias)] = entry;
  });
  return map;
}, {});

type Props = {
  sections: EditorSection[];
  onOpenEdit: (sectionId: number, sectionKey: string, field: string, label: string, type: EditTarget["type"]) => void;
  onToggle: (sectionId: number) => void;
  onMoveUp: (sectionId: number) => void;
  onMoveDown: (sectionId: number) => void;
};

const renderUnknownSection = (section: EditorSection): ReactElement => (
  <div className="cms-editor-shell__unknown">
    <p>
      Unknown section: <code>{section.key}</code>
    </p>
  </div>
);

export function CmsEditorShell({ sections, onOpenEdit, onToggle, onMoveUp, onMoveDown }: Props) {
  const orderedSections = [...sections].sort((a, b) => {
    const sortDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    if (sortDiff !== 0) return sortDiff;
    return Number(a.id ?? 0) - Number(b.id ?? 0);
  });

  return (
    <div className="cms-editor-shell">
      <div className="cms-editor-shell__frame">
        <HeaderOne />
        <main className="main-area fix">
          {orderedSections.map((section, index) => {
            const renderer = SECTION_MAP[normalizeKey(section.key)];
            const SectionComponent = renderer?.component;

            return (
              <SectionWrapper
                key={section.id}
                section={section}
                editableFields={renderer?.fields ?? []}
                onOpenEdit={onOpenEdit}
                onToggle={onToggle}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                isFirst={index === 0}
                isLast={index === orderedSections.length - 1}
              >
                {SectionComponent ? <SectionComponent content={section.local} /> : renderUnknownSection(section)}
              </SectionWrapper>
            );
          })}
        </main>
        <FooterOne />
      </div>
    </div>
  );
}
