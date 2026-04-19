// File: frontend/src/dashboard/pages/admin/CmsThemeTokensPage.tsx
// Purpose: Renders the admin CMS theme tokens page page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../components/Badge";
import { Card } from "../../../components/Card";
import { PageShell } from "../../../components/PageShell";
import { PulseDots } from "../../../components/PulseDots";
import { ToastStack } from "../../../components/ToastStack";
import { useDashboardToasts } from "../../../hooks/useDashboardToasts";
import { ApiError, api, apiList } from "../../../utils/api";

type ThemeScope = "global" | "web" | "admin";

type ThemeTokenRow = {
  id: number;
  key: string;
  purpose: string | null;
  value: string;
  scope: ThemeScope;
  color_history: string[];
  updated_at: string;
};

type ThemeTokenDraft = {
  id: number | null;
  key: string;
  purpose: string;
  value: string;
  scope: ThemeScope;
};

const EMPTY_DRAFT: ThemeTokenDraft = {
  id: null,
  key: "",
  purpose: "",
  value: "",
  scope: "web",
};

const COLOR_KEYWORD_PATTERN = /(color|primary|secondary|background|cyan|blue|aqua)/i;
const COLOR_VALUE_PATTERN = /^(#|rgb\(|rgba\(|hsl\(|hsla\()/i;

const toDraft = (row: ThemeTokenRow): ThemeTokenDraft => ({
  id: row.id,
  key: row.key,
  purpose: String(row.purpose ?? ""),
  value: row.value,
  scope: row.scope,
});

const isColorToken = (key: string, value: string) =>
  COLOR_KEYWORD_PATTERN.test(key) || COLOR_VALUE_PATTERN.test(String(value || "").trim());

const normalizeHex = (value: string) => {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) {
    return null;
  }

  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex.split("").map((char) => `${char}${char}`).join("").toLowerCase()}`;
  }

  return `#${hex.toLowerCase()}`;
};

const colorToHex = (value: string) => {
  const normalizedHex = normalizeHex(value);
  if (normalizedHex) {
    return normalizedHex;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.fillStyle = "#000000";
  context.fillStyle = value;
  const resolved = context.fillStyle;
  const rgbMatch = String(resolved).match(/^#([\da-f]{6})$/i);
  if (!rgbMatch) {
    return null;
  }

  return `#${rgbMatch[1].toLowerCase()}`;
};

export function CmsThemeTokensPage() {
  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();
  const [rows, setRows] = useState<ThemeTokenRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<ThemeTokenDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const orderedRows = useMemo(
    () => [...rows].sort((a, b) => String(a.key).localeCompare(String(b.key))),
    [rows],
  );
  const selectedRow = useMemo(
    () => (typeof selectedId === "number" ? rows.find((row) => row.id === selectedId) ?? null : null),
    [rows, selectedId],
  );
  const isColorDraft = useMemo(() => isColorToken(draft.key, draft.value), [draft.key, draft.value]);
  const pickerValue = useMemo(() => colorToHex(draft.value) ?? "#0255e0", [draft.value]);
  const savedSwatchValue = selectedRow?.value ?? draft.value;
  const colorHistory = selectedRow?.color_history ?? [];

  useEffect(() => {
    if (error) {
      pushToast("error", error);
    }
  }, [error, pushToast]);

  useEffect(() => {
    if (success) {
      pushToast("success", success);
    }
  }, [pushToast, success]);

  const loadTheme = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiList<ThemeTokenRow>("/cms/theme?page=1&limit=200&sortBy=key&order=asc");
      setRows(result.data);
      const nextSelectedId = typeof selectedId === "number" && result.data.some((row) => row.id === selectedId)
        ? selectedId
        : result.data[0]?.id ?? null;
      setSelectedId(nextSelectedId);
      const nextRow = result.data.find((row) => row.id === nextSelectedId);
      setDraft(nextRow ? toDraft(nextRow) : EMPTY_DRAFT);
    } catch (err) {
      setRows([]);
      setSelectedId(null);
      setDraft(EMPTY_DRAFT);
      setError(err instanceof ApiError ? err.message || "Failed to load theme tokens." : "Failed to load theme tokens.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (row: ThemeTokenRow) => {
    setSelectedId(row.id);
    setDraft(toDraft(row));
    setError("");
    setSuccess("");
  };

  const handleCreate = () => {
    setSelectedId("new");
    setDraft(EMPTY_DRAFT);
    setError("");
    setSuccess("");
  };

  const saveToken = async () => {
    const payload = {
      key: draft.key.trim(),
      purpose: draft.purpose.trim(),
      value: draft.value.trim(),
      scope: draft.scope,
    };

    if (!payload.key || !payload.purpose || !payload.value) {
      setError("Key, purpose, and value are required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (draft.id) {
        await api<ThemeTokenRow>(`/cms/theme/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccess("Theme token updated successfully.");
      } else {
        await api<ThemeTokenRow>("/cms/theme", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Theme token created successfully.");
      }
      await loadTheme();
    } catch (err) {
      setError(err instanceof ApiError ? err.message || "Failed to save theme token." : "Failed to save theme token.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Theme Tokens"
      subtitle="Manage live design tokens used by the website and dashboard instead of the old static mock list."
      actions={
        <div className="cms-page-actions">
          <button className="btn btn--secondary" type="button" onClick={handleCreate} disabled={saving}>
            New Token
          </button>
          <button className="btn btn--primary" type="button" onClick={() => void saveToken()} disabled={saving || loading}>
            {saving ? "Saving..." : draft.id ? "Save Token" : "Create Token"}
          </button>
        </div>
      }
    >
      <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
      <Card className="cms-page-shell">
        <div className="cms-page-tabs" role="tablist" aria-label="Theme tokens">
          {orderedRows.map((row) => {
            const isActive = selectedId === row.id;
            return (
              <button
                key={row.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`cms-page-tab ${isActive ? "is-active" : ""}`}
                onClick={() => handleSelect(row)}
              >
                {isColorToken(row.key, row.value) ? (
                  <span
                    aria-hidden="true"
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "999px",
                      background: row.value,
                      border: "1px solid rgba(15, 23, 42, 0.12)",
                      flexShrink: 0,
                    }}
                  />
                ) : null}
                <span className="cms-page-tab__title">{row.key}</span>
                <span className="cms-page-tab__meta">{row.purpose || "Theme token"}</span>
                <span className="cms-page-tab__status is-published">{row.scope}</span>
              </button>
            );
          })}
          <button
            type="button"
            role="tab"
            aria-selected={selectedId === "new"}
            className={`cms-page-tab cms-page-tab--add ${selectedId === "new" ? "is-active" : ""}`}
            onClick={handleCreate}
          >
            <span className="cms-page-tab__title">New Token</span>
            <span className="cms-page-tab__meta">Create a new CSS variable entry</span>
          </button>
        </div>

        <div className="cms-page-layout">
          <div className="cms-page-header-card">
            <div>
              <p className="cms-page-header-card__eyebrow">Website and dashboard design system</p>
              <h3 className="section-title">{draft.id ? draft.key : "Create Token"}</h3>
              <p className="info-text info-text--small">Scopes: `web` for public site, `admin` for dashboard, `global` for shared tokens.</p>
            </div>
            <div className="cms-page-header-card__badges">
              {draft.id ? <Badge tone="default">Existing Token</Badge> : <Badge tone="default">New Token</Badge>}
            </div>
          </div>

          <Card className="cms-page-editor-card">
            <div className="form-stack">
              <div className="cms-page-meta-grid">
                <label className="field">
                  <span className="field__label">Token Key</span>
                  <input
                    className="field__control"
                    value={draft.key}
                    onChange={(event) => setDraft((prev) => ({ ...prev, key: event.target.value }))}
                    placeholder="--primary"
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Scope</span>
                  <select
                    className="field__control"
                    value={draft.scope}
                    onChange={(event) => setDraft((prev) => ({ ...prev, scope: event.target.value as ThemeScope }))}
                    disabled={saving}
                  >
                    <option value="web">web</option>
                    <option value="admin">admin</option>
                    <option value="global">global</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span className="field__label">Purpose</span>
                <input
                  className="field__control"
                  value={draft.purpose}
                  onChange={(event) => setDraft((prev) => ({ ...prev, purpose: event.target.value }))}
                  placeholder="Primary buttons and links"
                  disabled={saving}
                />
              </label>

              <label className="field">
                <span
                  className="field__label"
                  style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}
                >
                  <span>Value</span>
                  {isColorDraft ? (
                    <>
                      <span
                        aria-hidden="true"
                        title={`Saved color: ${savedSwatchValue || "Not set"}`}
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "999px",
                          background: savedSwatchValue || "transparent",
                          border: "1px solid rgba(15, 23, 42, 0.12)",
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
                        }}
                      />
                      <span className="field__hint" style={{ margin: 0 }}>
                        Saved color: {savedSwatchValue || "Not set"}
                      </span>
                    </>
                  ) : null}
                </span>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  {isColorDraft ? (
                    <input
                      type="color"
                      value={pickerValue}
                      onChange={(event) => setDraft((prev) => ({ ...prev, value: event.target.value }))}
                      disabled={saving}
                      aria-label="Pick color value"
                      style={{
                        width: "56px",
                        height: "44px",
                        borderRadius: "12px",
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        background: "#fff",
                        padding: "4px",
                        cursor: saving ? "not-allowed" : "pointer",
                      }}
                    />
                  ) : null}
                  <input
                    className="field__control"
                    value={draft.value}
                    onChange={(event) => setDraft((prev) => ({ ...prev, value: event.target.value }))}
                    placeholder="#0d6efd"
                    disabled={saving}
                  />
                </div>
                <span className="field__hint">Use CSS-ready values like hex colors, spacing, gradients, or font stacks.</span>
                {isColorDraft && colorHistory.length ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                    <span className="field__hint" style={{ margin: 0 }}>Recent colors</span>
                    {colorHistory.slice(0, 10).map((historyValue, index) => (
                      <button
                        key={`${historyValue}-${index}`}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, value: historyValue }))}
                        title={`Use ${historyValue}`}
                        disabled={saving}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "999px",
                          border: "1px solid rgba(15, 23, 42, 0.12)",
                          background: historyValue,
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                      >
                        <span className="sr-only">{historyValue}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </label>

              {loading ? <PulseDots padding={24} label="Loading tokens" /> : null}
            </div>
          </Card>
        </div>
      </Card>
    </PageShell>
  );
}

