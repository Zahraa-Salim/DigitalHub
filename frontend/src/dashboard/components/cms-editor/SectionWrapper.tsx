import type { ReactNode } from "react";
import type { EditorSection, EditTarget } from "../../hooks/useCmsEditor";

type EditableField = {
  field: string;
  label: string;
  type: EditTarget["type"];
};

type Props = {
  section: EditorSection;
  editableFields: EditableField[];
  children: ReactNode;
  onOpenEdit: (sectionId: number, sectionKey: string, field: string, label: string, type: EditTarget["type"]) => void;
  onToggle: (sectionId: number) => void;
  onMoveUp: (sectionId: number) => void;
  onMoveDown: (sectionId: number) => void;
  isFirst: boolean;
  isLast: boolean;
};

export function SectionWrapper({
  section,
  editableFields,
  children,
  onOpenEdit,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  return (
    <div
      className={`cms-section-wrapper${section.isDirty ? " cms-section-wrapper--dirty" : ""}${!section.is_enabled ? " cms-section-wrapper--disabled" : ""}`}
      data-section-key={section.key}
    >
      <div className="cms-section-toolbar">
        <span className="cms-section-toolbar__name">{section.title ?? section.key}</span>

        <div className="cms-section-toolbar__actions">
          {editableFields.map((field) => (
            <button
              key={field.field}
              className="cms-section-toolbar__btn"
              type="button"
              title={`Edit ${field.label}`}
              onClick={() => onOpenEdit(section.id, section.key, field.field, field.label, field.type)}
            >
              Edit {field.label}
            </button>
          ))}

          {!isFirst ? (
            <button
              className="cms-section-toolbar__btn cms-section-toolbar__btn--icon"
              type="button"
              onClick={() => onMoveUp(section.id)}
              title="Move up"
            >
              Up
            </button>
          ) : null}

          {!isLast ? (
            <button
              className="cms-section-toolbar__btn cms-section-toolbar__btn--icon"
              type="button"
              onClick={() => onMoveDown(section.id)}
              title="Move down"
            >
              Down
            </button>
          ) : null}

          <button
            className={`cms-section-toolbar__toggle${section.is_enabled ? "" : " cms-section-toolbar__toggle--off"}`}
            type="button"
            onClick={() => onToggle(section.id)}
            title={section.is_enabled ? "Hide section" : "Show section"}
          >
            {section.is_enabled ? "Visible" : "Hidden"}
          </button>

          {section.isDirty ? <span className="cms-section-toolbar__dirty-dot" title="Unsaved changes" /> : null}
        </div>
      </div>

      <div className={`cms-section-wrapper__content${!section.is_enabled ? " cms-section-wrapper__content--faded" : ""}`}>
        {children}
      </div>
    </div>
  );
}
