import { useEffect, useMemo, useState } from "react";
import type { AnnouncementTargetAudience } from "../lib/announcementPrompts";
import { useDashboardToasts } from "../hooks/useDashboardToasts";
import { ToastStack } from "./ToastStack";

type AnnouncementPromptPayload = {
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  is_published: boolean;
  publish_at: string | null;
  target_audience: AnnouncementTargetAudience;
};

type AnnouncementPromptModalProps = {
  open: boolean;
  heading?: string;
  summary?: string;
  defaultTitle: string;
  defaultBody: string;
  defaultCtaLabel: string;
  defaultCtaUrl: string;
  defaultTargetAudience?: AnnouncementTargetAudience;
  onConfirm: (payload: AnnouncementPromptPayload) => Promise<void>;
  onSkip: () => void;
  saving: boolean;
};

function toDateTimeInputValue(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function AnnouncementPromptModal({
  open,
  heading = "Create Announcement?",
  summary = "Would you like to publish an announcement?",
  defaultTitle,
  defaultBody,
  defaultCtaLabel,
  defaultCtaUrl,
  defaultTargetAudience = "website",
  onConfirm,
  onSkip,
  saving,
}: AnnouncementPromptModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [ctaLabel, setCtaLabel] = useState(defaultCtaLabel);
  const [ctaUrl, setCtaUrl] = useState(defaultCtaUrl);
  const [targetAudience, setTargetAudience] = useState<AnnouncementTargetAudience>(defaultTargetAudience);
  const [publishMode, setPublishMode] = useState<"now" | "later">("now");
  const [publishAt, setPublishAt] = useState(toDateTimeInputValue(new Date()));
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setBody(defaultBody);
    setCtaLabel(defaultCtaLabel);
    setCtaUrl(defaultCtaUrl);
    setTargetAudience(defaultTargetAudience);
    setPublishMode("now");
    setPublishAt(toDateTimeInputValue(new Date()));
  }, [defaultBody, defaultCtaLabel, defaultCtaUrl, defaultTargetAudience, defaultTitle, open]);

  const publishAtIso = useMemo(() => (publishMode === "later" ? toIsoDateTime(publishAt) : new Date().toISOString()), [publishAt, publishMode]);

  if (!open) {
    return null;
  }

  const handleConfirm = async () => {
    const nextTitle = title.trim();
    const nextBody = body.trim();
    const nextCtaLabel = ctaLabel.trim();
    const nextCtaUrl = ctaUrl.trim();

    if (!nextTitle) {
      pushToast("error", "Title is required.");
      return;
    }
    if (!nextBody) {
      pushToast("error", "Body is required.");
      return;
    }
    if (nextCtaLabel && !nextCtaUrl) {
      pushToast("error", "CTA URL is required when CTA label is provided.");
      return;
    }
    if (publishMode === "later" && !publishAtIso) {
      pushToast("error", "Choose a valid publish date and time.");
      return;
    }

    await onConfirm({
      title: nextTitle,
      body: nextBody,
      cta_label: nextCtaUrl ? nextCtaLabel || "Learn More" : null,
      cta_url: nextCtaUrl || null,
      is_published: publishMode === "now",
      publish_at: publishAtIso,
      target_audience: targetAudience,
    });
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card ann-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h3 className="modal-title">{heading}</h3>
        </header>

        <p className="post-details__line ann-modal__summary">{summary}</p>

        <div className="form-stack">
          <label className="field ann-prompt-field">
            <span className="field__label">Title</span>
            <input className="field__control" type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className="field ann-prompt-field">
            <span className="field__label">Body</span>
            <textarea className="textarea-control" rows={5} value={body} onChange={(event) => setBody(event.target.value)} />
          </label>

          <div className="ann-modal__grid">
            <label className="field ann-prompt-field">
              <span className="field__label">CTA Label</span>
              <input className="field__control" type="text" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} />
            </label>

            <label className="field ann-prompt-field">
              <span className="field__label">CTA URL</span>
              <input className="field__control" type="text" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} />
            </label>
          </div>

          <div className="ann-modal__grid">
            <div className="field ann-prompt-field">
              <span className="field__label">Publish</span>
              <div className="ann-channel-opts">
                <label className="ann-option">
                  <input type="radio" name="announce-publish" checked={publishMode === "now"} onChange={() => setPublishMode("now")} />
                  <span>Now</span>
                </label>
                <label className="ann-option">
                  <input type="radio" name="announce-publish" checked={publishMode === "later"} onChange={() => setPublishMode("later")} />
                  <span>Later</span>
                </label>
              </div>
            </div>

            <label className="field ann-prompt-field">
              <span className="field__label">Publish At</span>
              <input
                className="field__control"
                type="datetime-local"
                value={publishAt}
                onChange={(event) => setPublishAt(event.target.value)}
                disabled={publishMode !== "later"}
              />
            </label>
          </div>

          <label className="field ann-prompt-field">
            <span className="field__label">Audience</span>
            <select
              className="field__control"
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value as AnnouncementTargetAudience)}
            >
              <option value="all">All</option>
              <option value="website">Website only</option>
              <option value="admin">Admin only</option>
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn btn--secondary" type="button" onClick={onSkip} disabled={saving}>
            Skip
          </button>
          <button className="btn btn--primary" type="button" onClick={() => void handleConfirm()} disabled={saving}>
            {saving ? "Publishing..." : "Publish Announcement"}
          </button>
        </div>
        <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
