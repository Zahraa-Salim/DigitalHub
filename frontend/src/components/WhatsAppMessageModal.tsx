// File: frontend/src/components/WhatsAppMessageModal.tsx
// Purpose: Renders a reusable modal for sending WhatsApp messages.
// It handles local validation and API calls for WhatsApp delivery.

import { useEffect, useMemo, useState } from "react";
import { sendWhatsApp } from "@/services/whatsappService";

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setPhone(normalizePhone(prefillPhone || ""));
    setMessage("");
    setError("");
    setSuccess("");
    setSending(false);
  }, [isOpen, prefillPhone]);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const canSend = normalizedPhone.length > 0 && message.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;

    setSending(true);
    setError("");
    setSuccess("");

    const result = await sendWhatsApp(normalizedPhone, message.trim());

    if (!result.success) {
      setError("error" in result ? result.error.message || "Failed to send WhatsApp message." : "Failed to send WhatsApp message.");
      setSending(false);
      return;
    }

    setSuccess("WhatsApp message sent successfully.");
    setMessage("");
    setSending(false);
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
          {error ? <p className="admx-inline-error">{error}</p> : null}
          {success ? <p className="admx-inline-success">{success}</p> : null}

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
                if (error) setError("");
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
                if (error) setError("");
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
      </div>
    </div>
  );
}
