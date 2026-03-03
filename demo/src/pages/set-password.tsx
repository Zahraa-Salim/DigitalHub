"use client";

import Wrapper from "@/layouts/Wrapper";
import HeaderOne from "@/layouts/headers/HeaderOne";
import FooterOne from "@/layouts/footers/FooterOne";
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import GuestOnly from "@/components/auth/GuestOnly";

import { useSearchParams, useRouter } from "@/utils/navigation";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function SetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useMemo(() => searchParams.get("token"), [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 🔒 BLOCK ACCESS WITHOUT TOKEN
  useEffect(() => {
    if (!token) {
      router.replace("/login"); // or "/404"
    }
  }, [token, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (newPassword.length < 8)
      return setErr("Password must be at least 8 characters.");
    if (newPassword !== confirm)
      return setErr("Passwords do not match.");

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to set password.");
      }

      setMsg("Password set successfully. Redirecting...");
      setTimeout(() => router.push("/login"), 800);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ⛔ Prevent rendering while redirecting
  if (!token) return null;

  return (
    <Wrapper>
      <HeaderOne />

      <main className="main-area fix">
        <BreadcrumbOne title="Set Password" sub_title="Set Password" />

        <GuestOnly>
          <section className="singUp-area section-py-120">
            <div className="container">
              <div className="row justify-content-center">
                <div className="col-xl-6 col-lg-8">
                  <div className="singUp-wrap">
                    <h2 className="title">Set your password</h2>

                    {err && <p className="text-danger mb-2">{err}</p>}
                    {msg && <p className="text-success mb-2">{msg}</p>}

                    <form onSubmit={submit} className="account__form">
                      <div className="form-grp">
                        <label>New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                        />
                      </div>

                      <div className="form-grp">
                        <label>Confirm Password</label>
                        <input
                          type="password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                        />
                      </div>

                      <button className="btn" disabled={loading}>
                        {loading ? "Saving..." : "Set Password"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </GuestOnly>
      </main>

      <FooterOne />
    </Wrapper>
  );
}

