import { useEffect, useRef, useState } from "react";
import type { EditTarget } from "../../hooks/useCmsEditor";

type Props = {
  target: EditTarget | null;
  onUpdate: (sectionId: number, field: string, value: string) => void;
  onClose: () => void;
};

export function EditPanel({ target, onUpdate, onClose }: Props) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!target) return;
    setDraft(target.currentValue);

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [target]);

  if (!target) return null;

  const apply = () => {
    onUpdate(target.sectionId, target.field, draft);
  };

  return (
    <aside className="cms-edit-panel" aria-label="CMS edit panel">
      <div className="cms-edit-panel__header">
        <span className="cms-edit-panel__label">{target.label}</span>
        <button className="cms-edit-panel__close" type="button" onClick={onClose} aria-label="Close">
          X
        </button>
      </div>

      <div className="cms-edit-panel__body">
        {target.type === "image" ? (
          <>
            <p className="cms-edit-panel__hint">Enter a public image URL.</p>
            {draft ? (
              <img
                src={draft}
                alt="Preview"
                className="cms-edit-panel__img-preview"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <textarea
              ref={inputRef}
              className="cms-edit-panel__input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              placeholder="https://..."
            />
          </>
        ) : (
          <textarea
            ref={inputRef}
            className="cms-edit-panel__input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={target.type === "textarea" || target.type === "richtext" ? 8 : 3}
            placeholder={`Edit ${target.label.toLowerCase()}...`}
          />
        )}
      </div>

      <div className="cms-edit-panel__footer">
        <button className="cms-edit-panel__btn cms-edit-panel__btn--secondary" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="cms-edit-panel__btn cms-edit-panel__btn--primary" type="button" onClick={apply}>
          Apply
        </button>
      </div>
    </aside>
  );
}
