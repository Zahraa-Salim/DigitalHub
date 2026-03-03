"use client";

import { useState } from "react";
import BtnArrow from "@/svg/BtnArrow";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!email.trim()) return setError("Email is required");

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/auth/request-password-reset-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to send reset email");
      }

      // Backend intentionally returns success even if email doesn't exist (security)
      setMsg("If this email exists, a reset link has been sent.");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="account__form">
      {error ? <p className="text-danger mb-3">{error}</p> : null}
      {msg ? <p className="text-success mb-3">{msg}</p> : null}

      <div className="form-grp">
        <label htmlFor="reset-email">Email</label>
        <input
          id="reset-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <button type="submit" className="btn btn-two arrow-btn" disabled={loading}>
        {loading ? "Sending..." : "Send Reset Link"} <BtnArrow />
      </button>
    </form>
  );
}

