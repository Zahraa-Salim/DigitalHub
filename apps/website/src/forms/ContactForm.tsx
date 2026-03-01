"use client";

import BtnArrow from "@/svg/BtnArrow";
import React, { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type ContactFormState = {
  success: boolean;
  error: string | null;
};

export default function ContactForm() {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ContactFormState>({
    success: false,
    error: null,
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setState({ success: false, error: null });

    try {
      const formData = new FormData(e.currentTarget);
      const payload = {
        name: String(formData.get("fullName") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim() || undefined,
        subject: String(formData.get("subject") || "").trim() || undefined,
        message: String(formData.get("message") || "").trim(),
        kind: "question" as const,
      };

      const res = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = "Unable to send message right now. Please try again.";
        try {
          const json = (await res.json()) as { error?: { message?: string } };
          if (json?.error?.message) message = json.error.message;
        } catch {
          // Use fallback message.
        }
        throw new Error(message);
      }

      setState({ success: true, error: null });
      e.currentTarget.reset();
    } catch (error) {
      setState({
        success: false,
        error: error instanceof Error ? error.message : "Unable to send message right now. Please try again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} id="contact-form">
      <div className="form-grp">
        <textarea name="message" placeholder="Comment" required></textarea>
      </div>

      <div className="row">
        <div className="col-md-4">
          <div className="form-grp">
            <input name="fullName" type="text" placeholder="Name *" required />
          </div>
        </div>

        <div className="col-md-4">
          <div className="form-grp">
            <input name="email" type="email" placeholder="E-mail *" required />
          </div>
        </div>

        <div className="col-md-4">
          <div className="form-grp">
            <input name="phone" type="tel" placeholder="Phone (optional)" />
          </div>
        </div>
      </div>

      <div className="form-grp mt-3">
        <input name="subject" type="text" placeholder="Subject *" required />
      </div>

      <button type="submit" className="btn btn-two arrow-btn" disabled={pending}>
        {pending ? "Sending..." : "Submit Now"} <BtnArrow />
      </button>

      {state.success && <p className="text-success mt-2">Message sent successfully.</p>}
      {state.error && <p className="text-danger mt-2">Error: {state.error}</p>}
    </form>
  );
}
