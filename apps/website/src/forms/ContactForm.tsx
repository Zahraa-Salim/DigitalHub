"use client";

import BtnArrow from "@/svg/BtnArrow";
import { notifyError, notifySuccess } from "@/lib/feedbackToast";
import { submitPublicContact, type PublicContactKind } from "@/lib/publicApi";
import React, { useEffect, useState } from "react";

const KIND_OPTIONS: Array<{ value: PublicContactKind; label: string }> = [
  { value: "question", label: "General Question" },
  { value: "feedback", label: "Feedback" },
  { value: "visit_request", label: "Visit Request" },
];

const normalizeKind = (raw: string | null): PublicContactKind => {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "visit_request" || value === "visit-request" || value === "visit" || value === "join_team") {
    return "visit_request";
  }
  if (value === "feedback") {
    return "feedback";
  }
  return "question";
};

export default function ContactForm() {
  const [pending, setPending] = useState(false);
  const [kind, setKind] = useState<PublicContactKind>("question");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setKind(normalizeKind(params.get("kind")));
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);

    try {
      const formData = new FormData(e.currentTarget);
      const companyName = String(formData.get("company_name") || "").trim();
      const linkedInUrl = String(formData.get("linkedin_url") || "").trim();
      const message = String(formData.get("message") || "").trim();
      const subjectInput = String(formData.get("subject") || "").trim();

      if (kind === "visit_request" && !companyName) {
        throw new Error("Company name is required for visit requests.");
      }

      const payload = {
        name: String(formData.get("fullName") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim() || undefined,
        subject: kind === "visit_request" ? "Visit Request" : subjectInput || undefined,
        message,
        kind,
        company_name: kind === "visit_request" ? companyName : undefined,
        linkedin_url: kind === "visit_request" ? linkedInUrl || undefined : undefined,
        visit_preferred_dates:
          kind === "visit_request" ? String(formData.get("visit_preferred_dates") || "").trim() || undefined : undefined,
        visit_notes: kind === "visit_request" ? message : undefined,
      };

      await submitPublicContact(payload);

      notifySuccess("Message sent successfully.", { id: "contact-form-success" });
      e.currentTarget.reset();
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Unable to send message right now. Please try again.",
        { id: "contact-form-error" },
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} id="contact-form">
      <div className="contact-kind-filter">
        <label className="contact-kind-filter__label">Message Type</label>
        <ul className="list-wrap">
          {KIND_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`contact-kind-filter__btn ${kind === option.value ? "is-active" : ""}`}
                onClick={() => setKind(option.value)}
                aria-pressed={kind === option.value}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="form-grp">
        <textarea
          name="message"
          placeholder={kind === "visit_request" ? "Tell us about your visit request" : "Comment"}
          required
        ></textarea>
      </div>

      {kind === "visit_request" ? (
        <div className="row">
          <div className="col-md-6">
            <div className="form-grp">
              <input name="company_name" type="text" placeholder="Company Name *" required />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-grp">
              <input name="linkedin_url" type="url" placeholder="LinkedIn Profile (optional)" />
            </div>
          </div>

          <div className="col-12">
            <div className="form-grp">
              <input name="visit_preferred_dates" type="text" placeholder="Preferred Visit Dates (optional)" />
            </div>
          </div>
        </div>
      ) : (
        <div className="form-grp mt-3">
          <input name="subject" type="text" placeholder="Subject *" required />
        </div>
      )}

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

      <button type="submit" className="btn btn-two arrow-btn" disabled={pending}>
        {pending ? "Sending..." : "Submit Now"} <BtnArrow />
      </button>
    </form>
  );
}
