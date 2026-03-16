import { useEffect, useRef, useState, type ElementType, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEditor } from "./EditorContext";

type Props = {
  pageKey: string;
  field: string;
  fallback: string;
  tag?: keyof React.JSX.IntrinsicElements;
  className?: string;
  multiline?: boolean;
  children?: ReactNode;
};

const toPseudoId = (pageKey: string) => -Math.max(1, pageKey.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0));

export function EditablePageSpan({
  pageKey,
  field,
  fallback,
  tag = "span",
  className,
  multiline,
  children,
}: Props) {
  const { getPageValue, setPageValue, activeField, openField, closeField } = useEditor();
  const rawValue = getPageValue(pageKey, field);
  const displayValue = rawValue || fallback;
  const pseudoId = toPseudoId(pageKey);
  const isActive = activeField?.sectionId === pseudoId && activeField?.field === field;
  const anchorRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [draft, setDraft] = useState(displayValue);
  const El = tag as ElementType;

  useEffect(() => {
    if (!isActive) return;
    setDraft(getPageValue(pageKey, field) || fallback);
    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fallback, field, getPageValue, isActive, pageKey]);

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (anchorRef.current) {
      openField(pseudoId, field, multiline ? "textarea" : "text", anchorRef.current);
    }
  };

  const handleApply = () => {
    setPageValue(pageKey, field, draft);
    closeField();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeField();
    }
    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      handleApply();
    }
  };

  return (
    <>
      <El
        ref={(node: HTMLElement | null) => {
          anchorRef.current = node;
        }}
        className={`${className ?? ""} cms-editable-text${isActive ? " cms-editable-text--active" : ""}`}
        onClick={handleClick}
        title="Click to edit"
      >
        {children ?? displayValue}
      </El>

      {isActive && anchorRef.current ? (
        <InlinePopover anchor={anchorRef.current} onClose={closeField}>
          <div className="cms-popover__inner">
            {multiline ? (
              <textarea
                ref={(node) => {
                  inputRef.current = node;
                }}
                className="cms-popover__input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
              />
            ) : (
              <input
                ref={(node) => {
                  inputRef.current = node;
                }}
                className="cms-popover__input"
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
              />
            )}
            <div className="cms-popover__actions">
              <button className="cms-popover__btn cms-popover__btn--cancel" type="button" onClick={closeField}>
                Cancel
              </button>
              <button className="cms-popover__btn cms-popover__btn--apply" type="button" onClick={handleApply}>
                Apply
              </button>
            </div>
          </div>
        </InlinePopover>
      ) : null}
    </>
  );
}

function InlinePopover({ anchor, onClose, children }: { anchor: HTMLElement; onClose: () => void; children: ReactNode }) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      setPos({
        top: rect.bottom + 6,
        left: Math.max(8, rect.left),
        width: Math.max(280, rect.width),
      });
    };

    updatePosition();

    const handleOutside = (event: globalThis.MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && event.target !== anchor) {
        onClose();
      }
    };

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
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      className="cms-popover"
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
    >
      {children}
    </div>,
    document.body,
  );
}
