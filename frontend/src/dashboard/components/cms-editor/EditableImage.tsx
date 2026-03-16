import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image, { type StaticImageData } from "@/components/common/Image";
import { useEditor } from "./EditorContext";

type Props = {
  sectionId: number;
  field: string;
  fallbackSrc: StaticImageData | string;
  alt?: string;
  className?: string;
};

export function EditableImage({ sectionId, field, fallbackSrc, alt, className }: Props) {
  const { getValue, setValue, activeField, openField, closeField } = useEditor();
  const rawUrl = getValue(sectionId, field);
  const src = rawUrl || fallbackSrc;
  const isActive = activeField?.sectionId === sectionId && activeField?.field === field;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState(rawUrl);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 });

  useEffect(() => {
    if (!isActive) return;

    setDraft(getValue(sectionId, field));

    const updatePosition = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 6,
        left: Math.max(8, rect.left),
        width: 320,
      });
    };

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target) && wrapRef.current && !wrapRef.current.contains(target)) {
        closeField();
      }
    };

    updatePosition();
    const timeoutId = window.setTimeout(() => {
      document.addEventListener("mousedown", handleOutside);
    }, 10);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [closeField, field, getValue, isActive, sectionId]);

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (wrapRef.current) {
      openField(sectionId, field, "image", wrapRef.current);
    }
  };

  const handleApply = () => {
    setValue(sectionId, field, draft);
    closeField();
  };

  return (
    <div ref={wrapRef} className="cms-editable-image-wrap" style={{ position: "relative", display: "inline-block" }}>
      <Image src={src} alt={alt ?? ""} className={className} />
      <button className="cms-editable-image-overlay" type="button" onClick={handleClick} title="Click to change image">
        <span className="cms-editable-image-overlay__icon">Edit</span>
        <span className="cms-editable-image-overlay__label">Image</span>
      </button>

      {isActive ? createPortal(
        <div
          ref={popoverRef}
          className="cms-popover"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className="cms-popover__inner">
            <p className="cms-popover__hint">Paste an image URL</p>
            {draft ? (
              <img
                src={draft}
                alt="Preview"
                className="cms-popover__img-preview"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <input
              className="cms-popover__input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeField();
                if (event.key === "Enter") handleApply();
              }}
              autoFocus
              placeholder="https://..."
            />
            <div className="cms-popover__actions">
              <button className="cms-popover__btn cms-popover__btn--cancel" type="button" onClick={closeField}>
                Cancel
              </button>
              <button className="cms-popover__btn cms-popover__btn--apply" type="button" onClick={handleApply}>
                Apply
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
