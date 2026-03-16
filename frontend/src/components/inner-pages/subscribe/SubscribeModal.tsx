// File: frontend/src/components/inner-pages/subscribe/SubscribeModal.tsx
// Purpose: Subscribe modal — phone number input with country code and topic preferences.

import { useEffect, useRef, useState } from "react";
import { submitPublicSubscribe } from "@/lib/publicApi";

const PREFERENCES = [
  { key: "open_programs",     label: "Open programs"         },
  { key: "upcoming_programs", label: "Upcoming programs"     },
  { key: "upcoming_events",   label: "Upcoming events"       },
  { key: "announcements",     label: "General announcements" },
  { key: "all",               label: "Everything"            },
] as const;

type Props = {
  onClose: () => void;
  initialPhone?: string;
};

function splitInitialPhone(value: string | undefined) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { countryCode: "+961", phone: "" };
  }

  const match = trimmed.match(/^(\+\d{1,4})(.*)$/);
  if (match) {
    return {
      countryCode: match[1],
      phone: match[2].trim(),
    };
  }

  return {
    countryCode: "+961",
    phone: trimmed,
  };
}

export default function SubscribeModal({ onClose, initialPhone = "" }: Props) {
  const initialState            = splitInitialPhone(initialPhone);
  const [countryCode, setCountryCode] = useState(initialState.countryCode);
  const [phone, setPhone]       = useState(initialState.phone);
  const [name, setName]         = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus]     = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const phoneRef                = useRef<HTMLInputElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => phoneRef.current?.focus(), 60);
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleSubmit = async () => {
    const trimmedCountryCode = countryCode.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedCountryCode) {
      setErrorMsg("Please enter a country code.");
      phoneRef.current?.focus();
      return;
    }
    const normalizedForValidation = trimmedCountryCode.startsWith("+")
      ? trimmedCountryCode
      : `+${trimmedCountryCode}`;
    if (!/^\+\d{1,4}$/.test(normalizedForValidation)) {
      setErrorMsg("Country code must be + followed by 1-4 digits (e.g. +961, +1, +44).");
      return;
    }
    if (!trimmedPhone) {
      setErrorMsg("Please enter your phone number.");
      phoneRef.current?.focus();
      return;
    }
    if (selected.length === 0) {
      setErrorMsg("Please select at least one topic.");
      return;
    }
    setErrorMsg("");
    setStatus("loading");
    try {
      const normalizedCountryCode = normalizedForValidation;
      const fullPhone = trimmedPhone.startsWith("+")
        ? trimmedPhone
        : `${normalizedCountryCode}${trimmedPhone}`;
      await submitPublicSubscribe({
        phone: fullPhone,
        name: name.trim() || undefined,
        preferences: selected,
      });
      setStatus("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  // ── Styles (all inline — no dependency on external CSS) ──────────────────
  const S: Record<string, React.CSSProperties> = {
    overlay: {
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      backgroundColor: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(3px)",
      WebkitBackdropFilter: "blur(3px)",
      animation: "dhFadeIn 0.18s ease",
    },
    card: {
      width: "100%",
      maxWidth: "460px",
      backgroundColor: "#fff",
      borderRadius: "16px",
      boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      padding: "32px 28px 28px",
      position: "relative",
      maxHeight: "90vh",
      overflowY: "auto",
    },
    closeBtn: {
      position: "absolute",
      top: "14px",
      right: "16px",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "20px",
      lineHeight: 1,
      color: "#9ca3af",
      padding: "4px 8px",
      borderRadius: "6px",
    },
    title: {
      fontSize: "20px",
      fontWeight: 700,
      color: "#111827",
      marginBottom: "4px",
      lineHeight: 1.3,
    },
    subtitle: {
      fontSize: "13px",
      color: "#6b7280",
      marginBottom: "24px",
      lineHeight: 1.5,
    },
    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: "#374151",
      marginBottom: "6px",
      letterSpacing: "0.02em",
    },
    phoneRow: {
      display: "flex",
      alignItems: "stretch",
      gap: 0,
      marginBottom: "16px",
      border: "1.5px solid #d1d5db",
      borderRadius: "10px",
      overflow: "hidden",
      transition: "border-color 0.15s",
    },
    countryCodeInput: {
      width: "88px",
      border: "none",
      outline: "none",
      padding: "12px",
      backgroundColor: "#f3f4f6",
      borderRight: "1.5px solid #d1d5db",
      fontSize: "14px",
      fontWeight: 600,
      color: "#374151",
      flexShrink: 0,
      textAlign: "center" as const,
    },
    phoneInput: {
      flex: 1,
      border: "none",
      outline: "none",
      padding: "12px 14px",
      fontSize: "15px",
      color: "#111827",
      backgroundColor: "#fff",
      minWidth: 0,
    },
    nameInput: {
      width: "100%",
      border: "1.5px solid #d1d5db",
      borderRadius: "10px",
      padding: "11px 14px",
      fontSize: "14px",
      color: "#111827",
      backgroundColor: "#fff",
      outline: "none",
      marginBottom: "20px",
      boxSizing: "border-box" as const,
    },
    topicsLabel: {
      display: "block",
      fontSize: "12px",
      fontWeight: 600,
      color: "#374151",
      marginBottom: "10px",
      letterSpacing: "0.02em",
    },
    topicsList: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "8px",
      marginBottom: "20px",
    },
    topicRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
      padding: "9px 12px",
      borderRadius: "8px",
      border: "1.5px solid transparent",
      transition: "background 0.12s, border-color 0.12s",
    },
    topicRowSelected: {
      backgroundColor: "#eff6ff",
      border: "1.5px solid #bfdbfe",
    },
    topicCheckbox: {
      width: "17px",
      height: "17px",
      flexShrink: 0,
      accentColor: "#0255E0",
      cursor: "pointer",
    },
    topicLabel: {
      fontSize: "14px",
      color: "#374151",
      lineHeight: 1.4,
      cursor: "pointer",
    },
    errorMsg: {
      fontSize: "13px",
      color: "#dc2626",
      marginBottom: "14px",
      padding: "8px 12px",
      backgroundColor: "#fef2f2",
      borderRadius: "8px",
      border: "1px solid #fecaca",
    },
    actions: {
      display: "flex",
      gap: "10px",
      marginTop: "4px",
    },
    cancelBtn: {
      flex: 1,
      padding: "12px",
      border: "1.5px solid #d1d5db",
      borderRadius: "10px",
      backgroundColor: "transparent",
      fontSize: "14px",
      fontWeight: 600,
      color: "#374151",
      cursor: "pointer",
      transition: "background 0.12s",
    },
    submitBtn: {
      flex: 2,
      padding: "12px",
      border: "none",
      borderRadius: "10px",
      backgroundColor: "#0255E0",
      fontSize: "14px",
      fontWeight: 600,
      color: "#fff",
      cursor: "pointer",
      transition: "background 0.15s, transform 0.1s",
    },
    submitBtnDisabled: {
      opacity: 0.65,
      cursor: "not-allowed",
    },
    successIcon: {
      width: "52px",
      height: "52px",
      borderRadius: "50%",
      backgroundColor: "#d1fae5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 16px",
      fontSize: "24px",
    },
    successTitle: {
      fontSize: "18px",
      fontWeight: 700,
      color: "#111827",
      textAlign: "center" as const,
      marginBottom: "6px",
    },
    successMsg: {
      fontSize: "13px",
      color: "#6b7280",
      textAlign: "center" as const,
      marginBottom: "24px",
      lineHeight: 1.6,
    },
    doneBtn: {
      width: "100%",
      padding: "12px",
      border: "none",
      borderRadius: "10px",
      backgroundColor: "#0255E0",
      fontSize: "14px",
      fontWeight: 600,
      color: "#fff",
      cursor: "pointer",
    },
  };

  return (
    <>
      <style>{`@keyframes dhFadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>

      <div
        style={S.overlay}
        role="presentation"
        onClick={onClose}
      >
        <div
          style={S.card}
          role="dialog"
          aria-modal="true"
          aria-label="Subscribe to updates"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            style={S.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            &#x2715;
          </button>

          {status === "success" ? (
            <>
              <div style={S.successIcon}>&#x2713;</div>
              <p style={S.successTitle}>You&apos;re subscribed!</p>
              <p style={S.successMsg}>
                You&apos;ll receive WhatsApp updates about{" "}
                <strong>
                  {selected
                    .map((k) => PREFERENCES.find((p) => p.key === k)?.label ?? k)
                    .join(", ")}
                </strong>
                .
              </p>
              <button type="button" style={S.doneBtn} onClick={onClose}>
                Done
              </button>
            </>
          ) : (
            <>
              <p style={S.title}>Stay informed</p>
              <p style={S.subtitle}>
                Enter your phone number and choose what you&apos;d like to hear about.
                We&apos;ll send updates via WhatsApp.
              </p>

              <label style={S.label} htmlFor="sub-phone">Phone number</label>
              <div style={S.phoneRow}>
                <input
                  type="tel"
                  style={S.countryCodeInput}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="+961"
                  aria-label="Country code"
                  autoComplete="tel-country-code"
                />
                <input
                  ref={phoneRef}
                  id="sub-phone"
                  type="tel"
                  style={S.phoneInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 76 123 456"
                  autoComplete="tel-national"
                />
              </div>

              <label style={S.label} htmlFor="sub-name">
                Your name{" "}
                <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
              </label>
              <input
                id="sub-name"
                type="text"
                style={S.nameInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                autoComplete="name"
              />

              <span style={S.topicsLabel}>
                What would you like to hear about?{" "}
                <span style={{ fontWeight: 400, color: "#9ca3af" }}>(pick at least one)</span>
              </span>
              <div style={S.topicsList}>
                {PREFERENCES.map(({ key, label }) => (
                  <label
                    key={key}
                    style={{
                      ...S.topicRow,
                      ...(selected.includes(key) ? S.topicRowSelected : {}),
                    }}
                  >
                    <input
                      type="checkbox"
                      style={S.topicCheckbox}
                      checked={selected.includes(key)}
                      onChange={() => toggle(key)}
                    />
                    <span style={S.topicLabel}>{label}</span>
                  </label>
                ))}
              </div>

              {errorMsg && <p style={S.errorMsg}>{errorMsg}</p>}

              <div style={S.actions}>
                <button
                  type="button"
                  style={S.cancelBtn}
                  onClick={onClose}
                  disabled={status === "loading"}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={{
                    ...S.submitBtn,
                    ...(status === "loading" ? S.submitBtnDisabled : {}),
                  }}
                  onClick={() => void handleSubmit()}
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Subscribing…" : "Subscribe"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
