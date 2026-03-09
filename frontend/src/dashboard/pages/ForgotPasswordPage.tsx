// File: frontend/src/dashboard/pages/ForgotPasswordPage.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../utils/api";

type ForgotPasswordResponse = {
  message: string;
};

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const result = await api<ForgotPasswordResponse>(
        "/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        },
        false,
      );
      setSuccess(result.message || "If that email exists, a reset link has been sent.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-auth">
      <div className="auth-card auth-card--wide">
        <h1 className="auth-card__title">Forgot Password</h1>
        <p className="auth-card__subtitle">Enter your email and we&apos;ll send a password reset link.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Email</span>
            <input
              className="field__control"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </label>

          {error ? <p className="field__error">{error}</p> : null}
          {success ? <p className="field__success">{success}</p> : null}

          <button className="btn btn--primary btn--full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="btn-spinner" aria-hidden />
                Sending...
              </>
            ) : "Send Reset Link"}
          </button>
        </form>

        <p className="auth-footer">
          Back to <Link className="auth-link" to="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}
