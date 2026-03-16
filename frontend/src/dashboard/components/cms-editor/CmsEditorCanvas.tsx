import type { ComponentType } from "react";
import { useEditor } from "./EditorContext";
import BannerEditor from "./editorSections/BannerEditor";
import AboutEditor from "./editorSections/AboutEditor";
import FeaturesEditor from "./editorSections/FeaturesEditor";
import NewsletterEditor from "./editorSections/NewsletterEditor";
import InstructorSectionEditor from "./editorSections/InstructorSectionEditor";
import InstructorTwoEditor from "./editorSections/InstructorTwoEditor";
import CourseAreaEditor from "./editorSections/CourseAreaEditor";
import AnnouncementsEditor from "./editorSections/AnnouncementsEditor";
import FeaturedParticipantsEditor from "./editorSections/FeaturedParticipantsEditor";

const KEY_TO_EDITOR: Record<string, ComponentType<{ content: Record<string, unknown> | null; sectionId: number }>> = {
  banner: BannerEditor,
  hero: BannerEditor,
  about: AboutEditor,
  home_about: AboutEditor,
  features: FeaturesEditor,
  benefits: FeaturesEditor,
  journey: FeaturesEditor,
  newsletter: NewsletterEditor,
  subscribe: NewsletterEditor,
  instructors: InstructorSectionEditor,
  team: InstructorSectionEditor,
  featured_students: InstructorSectionEditor,
  apply_cta: InstructorTwoEditor,
  cta: InstructorTwoEditor,
  apply: InstructorTwoEditor,
  programs: CourseAreaEditor,
  courses: CourseAreaEditor,
  course_area: CourseAreaEditor,
  cohorts: CourseAreaEditor,
  announcements: AnnouncementsEditor,
  announcement_feed: AnnouncementsEditor,
  home_announcements: AnnouncementsEditor,
  featured_participants: FeaturedParticipantsEditor,
  featured_participant: FeaturedParticipantsEditor,
  participants_featured: FeaturedParticipantsEditor,
};

const normalizeKey = (value: string) => String(value || "").toLowerCase().trim().replace(/\s+/g, "_");

export function CmsEditorCanvas() {
  const { sections, toggleSection, moveSection } = useEditor();
  const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="cms-editor-canvas">
      {sorted.map((section, index) => {
        const EditorComponent = KEY_TO_EDITOR[normalizeKey(section.key)];

        return (
          <div
            key={section.id}
            className={`cms-canvas-section${section.isDirty ? " cms-canvas-section--dirty" : ""}${!section.is_enabled ? " cms-canvas-section--hidden" : ""}`}
          >
            <div className="cms-canvas-bar">
              <span className="cms-canvas-bar__name">{section.title ?? section.key}</span>
              <div className="cms-canvas-bar__controls">
                {index > 0 ? (
                  <button className="cms-canvas-bar__btn" type="button" onClick={() => moveSection(section.id, "up")} title="Move up">
                    Up
                  </button>
                ) : null}
                {index < sorted.length - 1 ? (
                  <button className="cms-canvas-bar__btn" type="button" onClick={() => moveSection(section.id, "down")} title="Move down">
                    Down
                  </button>
                ) : null}
                <button
                  className={`cms-canvas-bar__btn cms-canvas-bar__btn--toggle${section.is_enabled ? "" : " is-off"}`}
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  title={section.is_enabled ? "Hide section" : "Show section"}
                >
                  {section.is_enabled ? "Hide" : "Show"}
                </button>
                {section.isDirty ? <span className="cms-canvas-bar__dot" title="Unsaved" /> : null}
              </div>
            </div>

            {!section.is_enabled ? <div className="cms-canvas-section__overlay" /> : null}

            {EditorComponent ? (
              <EditorComponent content={section.local} sectionId={section.id} />
            ) : (
              <div className="cms-canvas-section__unknown">
                Unknown section: <code>{section.key}</code>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
