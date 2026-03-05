import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../utils/api";

type ResetPasswordResponse = {
  message: string;
};

export function ResetPasswordPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const result = await api<ResetPasswordResponse>(
        `/api/auth/reset-password/${encodeURIComponent(token)}`,
        {
          method: "POST",
          body: JSON.stringify({ password, confirmPassword }),
        },
        false,
      );
      setSuccess(result.message || "Password reset successful.");
      window.setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-auth">
      <div className="auth-card auth-card--wide">
        <h1 className="auth-card__title">Reset Password</h1>
        <p className="auth-card__subtitle">Enter and confirm your new password.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">New Password</span>
            <input
              className="field__control"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
          </label>

          <label className="field">
            <span className="field__label">Confirm Password</span>
            <input
              className="field__control"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          {error ? <p className="field__error">{error}</p> : null}
          {success ? <p className="field__success">{success}</p> : null}

          <button className="btn btn--primary btn--full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="btn-spinner" aria-hidden />
                Updating...
              </>
            ) : "Reset Password"}
          </button>
        </form>

        <p className="auth-footer">
          Back to <Link className="auth-link" to="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}
