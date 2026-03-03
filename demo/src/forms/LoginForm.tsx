"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/utils/navigation";
import BtnArrow from "@/svg/BtnArrow";
import Link from "@/components/common/Link";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

const LoginForm = () => {
  const router = useRouter();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // optional: preload email if remember used
  useEffect(() => {
    const saved = localStorage.getItem("student_email");
    if (saved) setEmail(saved);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Email is required");
    if (!password.trim()) return setError("Password is required");

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      }

      if (data?.twoFactorRequired) {
        setError("Admins must login from the admin dashboard.");
        return;
      }

      const user = data?.user;
      if (!user || !Array.isArray(user.roles)) {
        throw new Error("Invalid login response");
      }

      if (!user.roles.includes("STUDENT")) {
        setError("Only students can login here.");
        return;
      }

      if (remember) localStorage.setItem("student_email", email.trim());
      else localStorage.removeItem("student_email");

      // ✅ refresh session state so Header updates
      await refresh();

      router.push("/student-dashboard");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="account__form">
      {error ? (
        <p className="text-danger mb-3" style={{ fontSize: 14 }}>
          {error}
        </p>
      ) : null}

      <div className="form-grp">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="text"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div className="form-grp">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <div className="account__check">
        <div className="account__check-remember">
          <input
            type="checkbox"
            className="form-check-input"
            id="terms-check"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <label htmlFor="terms-check" className="form-check-label">
            Remember me
          </label>
        </div>

        <div className="account__check-forgot">
          <Link to="/reset-password">Forgot Password?</Link>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-two arrow-btn"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign In"} <BtnArrow />
      </button>
    </form>
  );
};

export default LoginForm;


