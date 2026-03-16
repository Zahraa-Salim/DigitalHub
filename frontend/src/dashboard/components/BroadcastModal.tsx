import { useEffect, useMemo, useState } from "react";
import { ApiError, getBroadcastPreview } from "../utils/api";
import { useDashboardToasts } from "../hooks/useDashboardToasts";
import { PulseDots } from "./PulseDots";
import { ToastStack } from "./ToastStack";

type BroadcastChannel = "email" | "whatsapp" | "both";
type RecipientType = "all_contacts" | "manual";

type BroadcastModalProps = {
  open: boolean;
  title: string;
  body: string;
  announcementId: number;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sending: boolean;
  onClose: () => void;
  onPreviewLoad?: (preview: {
    derived_topics: string[];
    subscriber_count: number;
    user_count: number;
  }) => void;
  onConfirm: (payload: {
    channel: BroadcastChannel;
    recipient_type: RecipientType;
    manual_recipients?: string[];
    include_subscribers?: boolean;
  }) => Promise<void>;
};

const topicLabelMap: Record<string, string> = {
  open_programs: "open programs",
  upcoming_programs: "upcoming programs",
  upcoming_events: "upcoming events",
  announcements: "general announcements",
};

export function BroadcastModal({
  open,
  title,
  body,
  announcementId,
  ctaLabel,
  ctaUrl,
  sending,
  onClose,
  onPreviewLoad,
  onConfirm,
}: BroadcastModalProps) {
  const [channel, setChannel] = useState<BroadcastChannel>("email");
  const [recipientType, setRecipientType] = useState<RecipientType>("all_contacts");
  const [manualRecipients, setManualRecipients] = useState("");
  const [includeSubscribers, setIncludeSubscribers] = useState(false);
  const [previewData, setPreviewData] = useState<{
    derived_topics: string[];
    subscriber_count: number;
    user_count: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();
  const preview = useMemo(() => {
    const ctaLine = ctaLabel && ctaUrl ? `${ctaLabel}: ${ctaUrl}` : "";
    return [body, ctaLine].filter(Boolean).join("\n\n");
  }, [body, ctaLabel, ctaUrl]);
  const derivedTopicLabel = useMemo(() => {
    if (!previewData?.derived_topics.length) return "";
    return previewData.derived_topics
      .map((topic) => topicLabelMap[topic] ?? topic)
      .join(", ");
  }, [previewData]);

  useEffect(() => {
    if (!open) return;
    setChannel("email");
    setRecipientType("all_contacts");
    setManualRecipients("");
    setIncludeSubscribers(false);
    setPreviewData(null);
    setPreviewLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open || announcementId <= 0) {
      return;
    }

    let active = true;

    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        const result = await getBroadcastPreview(announcementId);
        if (!active) return;
        const next = {
          derived_topics: result.derived_topics,
          subscriber_count: result.subscriber_count,
          user_count: result.user_count,
        };
        setPreviewData(next);
        onPreviewLoad?.(next);
      } catch (err) {
        if (!active) return;
        pushToast("error", err instanceof ApiError ? err.message : "Failed to load broadcast preview.");
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();
    return () => {
      active = false;
    };
  }, [announcementId, onPreviewLoad, open]);

  useEffect(() => {
    if (includeSubscribers && channel === "email") {
      setChannel("both");
    }
  }, [includeSubscribers, channel]);

  if (!open) {
    return null;
  }

  const handleConfirm = async () => {
    const recipients = manualRecipients
      .split(/[\n,;]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (recipientType === "manual" && recipients.length === 0) {
      pushToast("error", "Add at least one manual recipient.");
      return;
    }

    await onConfirm({
      channel,
      recipient_type: recipientType,
      manual_recipients: recipientType === "manual" ? recipients : undefined,
      include_subscribers: includeSubscribers,
    });
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card ann-modal ann-modal--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h3 className="modal-title">Broadcast Announcement</h3>
        </header>

        <p className="post-details__line ann-modal__summary">"{title}"</p>

        <div className="form-stack">
          <div className="field ann-prompt-field">
            <span className="field__label">Channel</span>
            <div className="ann-channel-opts ann-channel-opts--spread">
              <label className="ann-option">
                <input type="radio" name="broadcast-channel" checked={channel === "email"} onChange={() => setChannel("email")} />
                <span>Email</span>
              </label>
              <label className="ann-option">
                <input type="radio" name="broadcast-channel" checked={channel === "whatsapp"} onChange={() => setChannel("whatsapp")} />
                <span>WhatsApp</span>
              </label>
              <label className="ann-option">
                <input type="radio" name="broadcast-channel" checked={channel === "both"} onChange={() => setChannel("both")} />
                <span>Both</span>
              </label>
            </div>
          </div>

          <div className="field ann-prompt-field">
            <span className="field__label">Recipients</span>
            <div className="ann-channel-opts ann-channel-opts--spread">
              <label className="ann-option">
                <input
                  type="radio"
                  name="broadcast-recipient-type"
                  checked={recipientType === "all_contacts"}
                  onChange={() => setRecipientType("all_contacts")}
                />
                <span>All contacts</span>
              </label>
              <label className="ann-option">
                <input
                  type="radio"
                  name="broadcast-recipient-type"
                  checked={recipientType === "manual"}
                  onChange={() => setRecipientType("manual")}
                />
                <span>Manual list</span>
              </label>
            </div>
          </div>

          {recipientType === "manual" ? (
            <label className="field ann-prompt-field">
              <span className="field__label">Manual recipients</span>
              <textarea
                className="textarea-control ann-broadcast-manual"
                rows={5}
                value={manualRecipients}
                onChange={(event) => setManualRecipients(event.target.value)}
                placeholder="Enter emails or phone numbers, separated by commas or new lines"
              />
            </label>
          ) : (
            <div className="field ann-prompt-field">
              <span className="field__label">Selected recipients</span>
              <p className="info-text ann-broadcast-hint">
                {previewData ? `All contacts (${previewData.user_count} users)` : "All contacts"}
              </p>
            </div>
          )}

          <label className="field ann-prompt-field" style={{ display: "grid", gap: 8 }}>
            <span className="field__label">Subscribers</span>
            <label className="ann-option" style={{ width: "fit-content" }}>
              <input
                type="checkbox"
                checked={includeSubscribers}
                onChange={(event) => setIncludeSubscribers(event.target.checked)}
              />
              <span>Also send to website subscribers</span>
            </label>
            {includeSubscribers && channel === "both" ? (
              <p className="info-text ann-broadcast-hint">
                Subscribers receive this via WhatsApp, so email-only broadcasts switch to Both.
              </p>
            ) : null}
            {includeSubscribers && previewLoading ? (
              <PulseDots layout="inline" label="Loading subscriber preview" />
            ) : null}
            {includeSubscribers && previewData && !previewLoading ? (
              <p className="info-text ann-broadcast-hint">
                {previewData.subscriber_count} subscriber{previewData.subscriber_count === 1 ? "" : "s"} interested in "{derivedTopicLabel}" will receive this via WhatsApp.
              </p>
            ) : null}
          </label>

          <div className="ann-broadcast-preview">
            <p className="field__label ann-broadcast-preview__label">Preview</p>
            <p className="ann-broadcast-preview__subject">Subject: {title}</p>
            <pre className="ann-broadcast-preview__body">{preview}</pre>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn--secondary" type="button" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => void handleConfirm()}
            disabled={sending}
          >
            {sending ? "Sending..." : "Send Broadcast"}
          </button>
        </div>
        <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
