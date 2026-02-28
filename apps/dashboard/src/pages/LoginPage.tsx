import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setToken, setUser } from "../utils/auth";
import { ApiError, api } from "../utils/api";

type LoginLocationState = {
  from?: string;
};

type LoginResponse = {
  token: string;
  expiresIn: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    admin_role: "admin" | "super_admin";
  };
};

export function LoginPage() {
  const [email, setEmail] = useState("admin@digitalhub.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LoginLocationState | null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const payload = await api<LoginResponse>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        },
        false,
      );

      setToken(payload.token);
      setUser(payload.user);

      navigate(state?.from || "/admin", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Login failed. Please try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-auth">
      <div className="auth-card">
        <h1 className="auth-card__title">Digital Hub Admin</h1>
        <p className="auth-card__subtitle">Sign in to access the dashboard.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Email</span>
            <input
              className="field__control"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Password</span>
            <input
              className="field__control"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="field__error">{error}</p> : null}

          <button className="btn btn--primary btn--full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
