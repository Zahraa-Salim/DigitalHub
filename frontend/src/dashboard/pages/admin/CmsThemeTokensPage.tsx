import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { ApiError, api, apiList } from "../../utils/api";

type ThemeScope = "global" | "web" | "admin";

type ThemeTokenRow = {
  id: number;
  key: string;
  purpose: string | null;
  value: string;
  scope: ThemeScope;
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

const toDraft = (row: ThemeTokenRow): ThemeTokenDraft => ({
  id: row.id,
  key: row.key,
  purpose: String(row.purpose ?? ""),
  value: row.value,
  scope: row.scope,
});

export function CmsThemeTokensPage() {
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
                <span className="field__label">Value</span>
                <input
                  className="field__control"
                  value={draft.value}
                  onChange={(event) => setDraft((prev) => ({ ...prev, value: event.target.value }))}
                  placeholder="#0d6efd"
                  disabled={saving}
                />
                <span className="field__hint">Use CSS-ready values like hex colors, spacing, gradients, or font stacks.</span>
              </label>

              {error ? <p className="field__error">{error}</p> : null}
              {success ? <p className="field__success">{success}</p> : null}
              {loading ? <p className="info-text">Loading theme tokens...</p> : null}
            </div>
          </Card>
        </div>
      </Card>
    </PageShell>
  );
}
