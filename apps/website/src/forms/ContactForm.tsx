// File: src/forms/ContactForm.tsx
// Purpose: Form component that handles user input, validation, and submission flow.
// If you change this file: Changing field names, validation rules, or handlers can break form behavior or submitted payload structures.
"use client";

import BtnArrow from "@/svg/BtnArrow";
import React, { useState } from "react";

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
      await new Promise((resolve) => setTimeout(resolve, 500));
      setState({ success: true, error: null });
      e.currentTarget.reset();
    } catch {
      setState({
        success: false,
        error: "Unable to send message right now. Please try again.",
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

      {state.success && (
        <p className="text-success mt-2">
          Message sent successfully.
        </p>
      )}
      {state.error && (
        <p className="text-danger mt-2">
          Error: {state.error}
        </p>
      )}
    </form>
  );
}
