import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { QuickPreviewPanel, type PreviewField } from "../../components/QuickPreviewPanel";
import { Table } from "../../components/Table";
import { ToastStack } from "../../components/ToastStack";
import { useDashboardToasts } from "../../hooks/useDashboardToasts";
import {
  ApiError,
  getSubscribers,
  patchSubscriber,
  type PaginationMeta,
  type SubscriberRow,
} from "../../utils/api";
import { formatDateTime } from "../../utils/format";

const defaultPagination: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };

const preferenceOptions = [
  { value: "all", label: "All preferences" },
  { value: "open_programs", label: "Open programs" },
  { value: "upcoming_programs", label: "Upcoming programs" },
  { value: "upcoming_events", label: "Upcoming events" },
  { value: "announcements", label: "Announcements" },
] as const;

const preferenceChoices = [
  { key: "open_programs", label: "Open programs" },
  { key: "upcoming_programs", label: "Upcoming programs" },
  { key: "upcoming_events", label: "Upcoming events" },
  { key: "announcements", label: "Announcements" },
  { key: "all", label: "Everything" },
] as const;

function formatPreferenceLabel(value: string) {
  return preferenceChoices.find((choice) => choice.key === value)?.label ?? value;
}

export function SubscribersPage() {
  const { toasts, pushToast, dismissToast } = useDashboardToasts();
  const [rows, setRows] = useState<SubscriberRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [preference, setPreference] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "opted_out">("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<SubscriberRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPreferences, setEditPreferences] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, preference, status]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getSubscribers({
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          preference: preference === "all" ? undefined : preference,
          active:
            status === "all" ? undefined : status === "active",
        });
        if (!active) return;
        setRows(result.data);
        setPagination(result.pagination);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load subscribers.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, preference, status, refreshKey]);

  useEffect(() => {
    if (!selected) {
      setEditName("");
      setEditPreferences([]);
      setEditActive(true);
      return;
    }

    setEditName(selected.name || "");
    setEditPreferences(Array.isArray(selected.preferences) ? selected.preferences : []);
    setEditActive(selected.is_active);
  }, [selected]);

  const totalPagesSafe = Math.max(1, pagination.totalPages);
  const activeCount = useMemo(() => rows.filter((row) => row.is_active).length, [rows]);
  const optedOutCount = useMemo(() => rows.filter((row) => !row.is_active).length, [rows]);

  useEffect(() => {
    if (error) {
      pushToast("error", error);
    }
  }, [error, pushToast]);

  const previewFields = useMemo<PreviewField[]>(
    () =>
      selected
        ? [
            { label: "Phone", value: selected.phone },
            { label: "Name", value: selected.name || "Not set" },
            { label: "Status", value: selected.is_active ? "Active" : "Opted out" },
            { label: "Source", value: selected.source },
            { label: "Subscribed", value: selected.created_at, type: "date" },
            {
              label: "Preferences",
              value: selected.preferences.length
                ? selected.preferences.map(formatPreferenceLabel).join(", ")
                : "None",
            },
          ]
        : [],
    [selected],
  );

  const togglePreference = (key: string) => {
    setEditPreferences((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key],
    );
  };

  const handleSave = async () => {
    if (!selected) return;
    if (!editPreferences.length) {
      pushToast("error", "Please select at least one preference.");
      return;
    }

    setSaving(true);
    try {
      const updated = await patchSubscriber(selected.id, {
        name: editName.trim() || null,
        preferences: editPreferences,
        is_active: editActive,
      });
      setSelected(updated);
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setRefreshKey((current) => current + 1);
      pushToast("success", "Subscriber updated.");
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to update subscriber.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Subscribers"
      subtitle="Manage website subscribers and the WhatsApp topics they receive."
    >
      <div className="dh-page">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <div className="stats-grid stats-grid--compact dh-stats">
          <Card className="stats-card">
            <p className="stats-card__label">Active (Page)</p>
            <p className="stats-card__value">{activeCount}</p>
            <p className="stats-card__hint">Currently subscribed</p>
          </Card>
          <Card className="stats-card">
            <p className="stats-card__label">Opted Out (Page)</p>
            <p className="stats-card__value">{optedOutCount}</p>
            <p className="stats-card__hint">Stopped receiving updates</p>
          </Card>
          <Card className="stats-card">
            <p className="stats-card__label">Total</p>
            <p className="stats-card__value">{pagination.total}</p>
            <p className="stats-card__hint">Matching subscribers</p>
          </Card>
        </div>

        <FilterBar
          className="dh-form-grid"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by phone or name"
          selects={[
            {
              label: "Preference",
              value: preference,
              options: preferenceOptions.map((option) => ({
                label: option.label,
                value: option.value,
              })),
              onChange: setPreference,
            },
            {
              label: "Status",
              value: status,
              options: [
                { label: "All", value: "all" },
                { label: "Active", value: "active" },
                { label: "Opted out", value: "opted_out" },
              ],
              onChange: (value) => setStatus(value as "all" | "active" | "opted_out"),
            },
          ]}
        />

        <Card className="card--table desktop-only dh-table-wrap">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
              <LoadingSpinner />
            </div>
          ) : (
            <Table<SubscriberRow>
              rows={rows}
              rowKey={(row) => row.id}
              onRowClick={setSelected}
              emptyMessage="No subscribers found. Try changing filters or search."
              columns={[
                { key: "phone", label: "Phone", className: "table-cell-strong", render: (row) => row.phone },
                { key: "name", label: "Name", render: (row) => row.name || "Not set" },
                {
                  key: "preferences",
                  label: "Preferences",
                  render: (row) => (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {row.preferences.map((entry) => (
                        <Badge key={entry} tone="default">
                          {formatPreferenceLabel(entry)}
                        </Badge>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => (
                    <Badge tone={row.is_active ? "resolved" : "draft"}>
                      {row.is_active ? "Active" : "Opted out"}
                    </Badge>
                  ),
                },
                { key: "source", label: "Source", render: (row) => row.source },
                { key: "created_at", label: "Date Subscribed", render: (row) => formatDateTime(row.created_at) },
              ]}
            />
          )}
        </Card>

        <div className="mobile-only programs-mobile-list">
          {loading ? (
            <Card>
              <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <LoadingSpinner />
              </div>
            </Card>
          ) : rows.length ? (
            rows.map((row) => (
              <Card key={row.id}>
                <article
                  className="program-mobile-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(row);
                    }
                  }}
                >
                  <p className="program-mobile-item__title">{row.phone}</p>
                  <p className="info-text"><strong>Name:</strong> {row.name || "Not set"}</p>
                  <p className="info-text"><strong>Source:</strong> {row.source}</p>
                  <p className="info-text">
                    <strong>Status:</strong> {row.is_active ? "Active" : "Opted out"}
                  </p>
                </article>
              </Card>
            ))
          ) : (
            <Card>
              <div className="empty-state">
                <p className="empty-state__title">No subscribers found</p>
                <p className="empty-state__description">Try removing filters or broadening your search.</p>
              </div>
            </Card>
          )}
        </div>

        {!loading && pagination.total > 0 ? (
          <Card>
            <Pagination page={pagination.page} totalPages={totalPagesSafe} onChange={setPage} />
          </Card>
        ) : null}
      </div>

      <QuickPreviewPanel
        isOpen={Boolean(selected)}
        title={selected?.phone || "Subscriber"}
        fields={previewFields}
        onClose={() => {
          if (!saving) {
            setSelected(null);
          }
        }}
      >
        {selected ? (
          <div className="form-stack" style={{ marginTop: 24 }}>
            <label className="field">
              <span className="field__label">Name</span>
              <input
                className="field__control"
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </label>

            <div className="field">
              <span className="field__label">Preferences</span>
              <div style={{ display: "grid", gap: 8 }}>
                {preferenceChoices.map((choice) => (
                  <label
                    key={choice.key}
                    style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={editPreferences.includes(choice.key)}
                      onChange={() => togglePreference(choice.key)}
                    />
                    <span>{choice.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={editActive}
                onChange={(event) => setEditActive(event.target.checked)}
              />
              <span className="field__label" style={{ marginBottom: 0 }}>Active subscriber</span>
            </label>

            <div className="modal-actions" style={{ padding: 0 }}>
              <button className="btn btn--secondary" type="button" onClick={() => setSelected(null)} disabled={saving}>
                Close
              </button>
              <button className="btn btn--primary" type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : null}
      </QuickPreviewPanel>
    </PageShell>
  );
}

export default SubscribersPage;
