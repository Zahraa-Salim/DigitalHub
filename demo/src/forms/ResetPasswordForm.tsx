"use client";

import { useState } from "react";
import { useRouter } from "@/utils/navigation";
import BtnArrow from "@/svg/BtnArrow";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

type ResetPasswordFormProps = {
  token: string;
};

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!token) return setError("Missing token. Please use the link from your email.");
    if (!newPassword.trim()) return setError("New password is required.");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters.");
    if (newPassword !== confirm) return setError("Passwords do not match.");

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/auth/reset-password-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to reset password.");
      }

      setMsg("Password updated successfully. Redirecting to login...");
      setTimeout(() => router.push("/login"), 900);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="account__form">
      {error ? <p className="text-danger mb-3">{error}</p> : null}
      {msg ? <p className="text-success mb-3">{msg}</p> : null}

      <div className="form-grp">
        <label htmlFor="new-password">New Password</label>
        <input
          id="new-password"
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      <div className="form-grp">
        <label htmlFor="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      <button type="submit" className="btn btn-two arrow-btn" disabled={loading}>
        {loading ? "Saving..." : "Reset Password"} <BtnArrow />
      </button>
    </form>
  );
}

