// File: frontend/src/forms/ContactForm.tsx
// What this code does:
// 1) Implements form fields, validation, and submission flows.
// 2) Normalizes user input before API requests are sent.
// 3) Handles loading, error, and success feedback states.
// 4) Keeps form behavior consistent across intake workflows.
"use client";

import BtnArrow from "@/svg/BtnArrow";
import { notifyError, notifySuccess } from "@/lib/feedbackToast";
import { submitPublicContact, type PublicContactKind } from "@/lib/publicApi";
import React, { useEffect, useState } from "react";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsString } from "@/lib/cmsContent";

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

  const page = useCmsPage("contact");
  const content = page?.content ?? null;

  const kindLabels: Record<PublicContactKind, string> = {
    question: getCmsString(
      content,
      ["kind_question_label", "kindQuestionLabel"],
      "General Question",
    ),
    feedback: getCmsString(
      content,
      ["kind_feedback_label", "kindFeedbackLabel"],
      "Feedback",
    ),
    visit_request: getCmsString(
      content,
      ["kind_visit_request_label", "kindVisitRequestLabel"],
      "Visit Request",
    ),
  };

  const messagePlaceholderDefault = getCmsString(
    content,
    ["message_placeholder", "comment_placeholder"],
    "Comment",
  );
  const messagePlaceholderVisit = getCmsString(
    content,
    ["visit_message_placeholder"],
    "Tell us about your visit request",
  );
  const subjectPlaceholder = getCmsString(
    content,
    ["subject_placeholder"],
    "Subject *",
  );
  const namePlaceholder = getCmsString(
    content,
    ["name_placeholder"],
    "Name *",
  );
  const emailPlaceholder = getCmsString(
    content,
    ["email_placeholder"],
    "E-mail *",
  );
  const phonePlaceholder = getCmsString(
    content,
    ["phone_placeholder"],
    "Phone (optional)",
  );
  const companyNamePlaceholder = getCmsString(
    content,
    ["company_name_placeholder"],
    "Company Name *",
  );
  const linkedinPlaceholder = getCmsString(
    content,
    ["linkedin_placeholder"],
    "LinkedIn Profile (optional)",
  );
  const visitDatesPlaceholder = getCmsString(
    content,
    ["visit_dates_placeholder"],
    "Preferred Visit Dates (optional)",
  );
  const companyRequiredError = getCmsString(
    content,
    ["visit_company_required_error"],
    "Company name is required for visit requests.",
  );
  const submitLabel = getCmsString(
    content,
    ["submit_button_text", "submitButtonText"],
    "Submit Now",
  );
  const submittingLabel = getCmsString(
    content,
    ["submit_sending_text", "submitSendingText"],
    "Sending...",
  );
  const genericErrorMessage = getCmsString(
    content,
    ["generic_error_message"],
    "Unable to send message right now. Please try again.",
  );
  const successMessage = getCmsString(
    content,
    ["success_message"],
    "Message sent successfully.",
  );

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
        throw new Error(companyRequiredError);
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

      notifySuccess(successMessage, { id: "contact-form-success" });
      e.currentTarget.reset();
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : genericErrorMessage,
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
                {kindLabels[option.value]}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="form-grp">
        <textarea
          name="message"
          placeholder={kind === "visit_request" ? messagePlaceholderVisit : messagePlaceholderDefault}
          required
        ></textarea>
      </div>

      {kind === "visit_request" ? (
        <div className="row">
          <div className="col-md-6">
            <div className="form-grp">
              <input name="company_name" type="text" placeholder={companyNamePlaceholder} required />
            </div>
          </div>

          <div className="col-md-6">
            <div className="form-grp">
              <input name="linkedin_url" type="url" placeholder={linkedinPlaceholder} />
            </div>
          </div>

          <div className="col-12">
            <div className="form-grp">
              <input name="visit_preferred_dates" type="text" placeholder={visitDatesPlaceholder} />
            </div>
          </div>
        </div>
      ) : (
        <div className="form-grp mt-3">
          <input name="subject" type="text" placeholder={subjectPlaceholder} required />
        </div>
      )}

      <div className="row">
        <div className="col-md-4">
          <div className="form-grp">
            <input name="fullName" type="text" placeholder={namePlaceholder} required />
          </div>
        </div>

        <div className="col-md-4">
          <div className="form-grp">
            <input name="email" type="email" placeholder={emailPlaceholder} required />
          </div>
        </div>

        <div className="col-md-4">
          <div className="form-grp">
            <input name="phone" type="tel" placeholder={phonePlaceholder} />
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-two arrow-btn" disabled={pending}>
        {pending ? submittingLabel : submitLabel} <BtnArrow />
      </button>
    </form>
  );
}
