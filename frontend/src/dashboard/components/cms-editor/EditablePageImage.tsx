import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image, { type StaticImageData } from "@/components/common/Image";
import { CmsMediaPickerModal, type CmsMediaAsset } from "../CmsMediaPickerModal";
import { useEditor } from "./EditorContext";

type Props = {
  pageKey: string;
  field: string;
  fallbackSrc: StaticImageData | string;
  alt?: string;
  className?: string;
  previewSrc?: StaticImageData | string;
};

const toPseudoId = (pageKey: string) => -Math.max(1, pageKey.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0));

const hasImageSrc = (value: StaticImageData | string | undefined): value is StaticImageData | string => {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

export function EditablePageImage({ pageKey, field, fallbackSrc, alt, className, previewSrc }: Props) {
  const { getPageValue, setPageValue, activeField, openField, closeField } = useEditor();
  const rawUrl = getPageValue(pageKey, field);
  const src = hasImageSrc(previewSrc)
    ? previewSrc
    : hasImageSrc(rawUrl)
      ? rawUrl
      : fallbackSrc;
  const pseudoId = toPseudoId(pageKey);
  const isActive = activeField?.sectionId === pseudoId && activeField?.field === field;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState(rawUrl);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 });
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setPickerOpen(false);
      return;
    }

    setDraft(getPageValue(pageKey, field));

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
  }, [closeField, field, getPageValue, isActive, pageKey]);

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (wrapRef.current) {
      openField(pseudoId, field, "image", wrapRef.current);
    }
  };

  const handleApply = () => {
    setPageValue(pageKey, field, draft);
    closeField();
  };

  const handleSelectAsset = (asset: CmsMediaAsset) => {
    setDraft(asset.public_url);
    setPageValue(pageKey, field, asset.public_url);
    setPickerOpen(false);
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
              <button className="cms-popover__btn cms-popover__btn--secondary" type="button" onClick={() => setPickerOpen(true)}>
                Upload / Library
              </button>
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
      <CmsMediaPickerModal
        isOpen={pickerOpen}
        selectedUrl={draft}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectAsset}
      />
    </div>
  );
}
