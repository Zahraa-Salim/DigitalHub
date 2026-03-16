// File: frontend/src/components/WhatsAppMessageModal.tsx
// Purpose: Renders a reusable modal for sending WhatsApp messages.
// It handles local validation and API calls for WhatsApp delivery.

import { useEffect, useMemo, useState } from "react";
import { sendWhatsApp } from "@/services/whatsappService";
import { useDashboardToasts } from "../dashboard/hooks/useDashboardToasts";
import { ToastStack } from "../dashboard/components/ToastStack";

export type WhatsAppMessageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  prefillPhone?: string | null;
};

const normalizePhone = (value: string) => String(value || "").replace(/\D/g, "");

export function WhatsAppMessageModal({ isOpen, onClose, prefillPhone }: WhatsAppMessageModalProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();

  useEffect(() => {
    if (!isOpen) return;
    setPhone(normalizePhone(prefillPhone || ""));
    setMessage("");
    setSending(false);
  }, [isOpen, prefillPhone]);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const canSend = normalizedPhone.length > 0 && message.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;

    setSending(true);

    const result = await sendWhatsApp(normalizedPhone, message.trim());

    if (!result.success) {
      pushToast(
        "error",
        "error" in result
          ? result.error.message || "Failed to send WhatsApp message."
          : "Failed to send WhatsApp message.",
      );
      setSending(false);
      return;
    }

    pushToast("success", "WhatsApp message sent successfully.");
    setMessage("");
    setSending(false);
    window.setTimeout(() => onClose(), 800);
  };

  if (!isOpen) return null;

  return (
    <div className="admx-modal" role="presentation">
      <div className="admx-modal__backdrop" onClick={onClose} />
      <div className="admx-modal__card" role="dialog" aria-modal="true">
        <header className="admx-modal__header">
          <div>
            <h3>Send WhatsApp Message</h3>
            <p>Deliver a direct WhatsApp message to a phone number.</p>
          </div>
        </header>

        <div className="admx-modal__body">
          <label className="field">
            <span className="field__label">Phone Number</span>
            <input
              className="field__control"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1234567890"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
              }}
            />
            <small className="field__hint">Use international format, digits only.</small>
          </label>

          <label className="field">
            <span className="field__label">Message</span>
            <textarea
              className="textarea-control"
              rows={6}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
              }}
              placeholder="Write the WhatsApp message here."
            />
          </label>
        </div>

        <footer className="admx-modal__footer">
          <button className="btn btn--secondary" type="button" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button className="btn btn--primary" type="button" onClick={() => void handleSend()} disabled={!canSend}>
            {sending ? "Sending..." : "Send WhatsApp"}
          </button>
        </footer>
        <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
