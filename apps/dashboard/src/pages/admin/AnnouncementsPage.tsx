import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { ApiError, api, apiList, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";

type Audience = "all" | "website" | "admin";
type SortBy = "created_at" | "publish_at";

type AnnouncementRow = {
  id: number;
  title: string;
  body: string;
  target_audience: Audience;
  cohort_id: number | null;
  is_published: boolean;
  publish_at: string | null;
  created_at: string;
};

type CohortOption = { id: number; name: string };

type FormState = {
  title: string;
  body: string;
  targetAudience: Audience;
  isPublished: boolean;
  publishAt: string;
  cohortId: string;
};

type FormMode = "create" | "edit" | null;

type ToastTone = "success" | "error";

const defaultPagination: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };
const initialForm: FormState = {
  title: "",
  body: "",
  targetAudience: "all",
  isPublished: true,
  publishAt: "",
  cohortId: "none",
};

function toDateTimeInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toFormState(item: AnnouncementRow | null): FormState {
  if (!item) return initialForm;
  return {
    title: item.title,
    body: item.body,
    targetAudience: item.target_audience,
    isPublished: item.is_published,
    publishAt: toDateTimeInputValue(item.publish_at),
    cohortId: item.cohort_id === null ? "none" : String(item.cohort_id),
  };
}

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [publishedFilter, setPublishedFilter] = useState<"all" | "true" | "false">("all");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<AnnouncementRow | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [filterSheetOffset, setFilterSheetOffset] = useState(0);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  const toastIdRef = useRef(1);
  const toastTimersRef = useRef<Record<number, number>>({});
  const filterDragStartYRef = useRef<number | null>(null);
  const filterOffsetRef = useRef(0);

  const showToast = (tone: ToastTone, message: string) => {
    const id = toastIdRef.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    const timeoutId = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      delete toastTimersRef.current[id];
    }, 3400);
    toastTimersRef.current[id] = timeoutId;
  };

  const dismissToast = (id: number) => {
    const timeoutId = toastTimersRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete toastTimersRef.current[id];
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    return () => {
      Object.values(toastTimersRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, audienceFilter, publishedFilter, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;
    const loadCohorts = async () => {
      try {
        const result = await apiList<CohortOption>(
          `/cohorts${buildQueryString({ limit: 100, sortBy: "name", order: "asc" })}`,
        );
        if (active) setCohorts(result.data);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message || "Failed to load cohorts." : "Failed to load cohorts.";
        showToast("error", message);
      }
    };
    void loadCohorts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadAnnouncements = async () => {
      setLoading(true);
      setError("");
      try {
        const status = publishedFilter === "all" ? undefined : publishedFilter === "true" ? "published" : "draft";
        const result = await apiList<AnnouncementRow>(
          `/announcements${buildQueryString({ page, limit: 10, search: debouncedSearch || undefined, status, sortBy, order: sortOrder })}`,
        );
        if (!active) return;
        setAnnouncements(result.data);
        setPagination(result.pagination);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message || "Failed to load announcements." : "Failed to load announcements.";
        setError(message);
        showToast("error", message);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadAnnouncements();
    return () => {
      active = false;
    };
  }, [debouncedSearch, page, publishedFilter, refreshKey, sortBy, sortOrder]);

  const filteredRows = useMemo(() => {
    if (audienceFilter === "all") return announcements;
    return announcements.filter((item) => item.target_audience === audienceFilter);
  }, [announcements, audienceFilter]);

  const cohortNameById = useMemo(() => {
    const map = new Map<number, string>();
    cohorts.forEach((cohort) => map.set(cohort.id, cohort.name));
    return map;
  }, [cohorts]);

  const getCohortLabel = (cohortId: number | null) => {
    if (cohortId === null) return "General";
    return cohortNameById.get(cohortId) || `#${cohortId}`;
  };

  const openCreate = () => {
    setFormMode("create");
    setEditing(null);
    setForm(initialForm);
    setFormError("");
    setError("");
  };

  const openEdit = (item: AnnouncementRow) => {
    setFormMode("edit");
    setEditing(item);
    setForm(toFormState(item));
    setFormError("");
    setError("");
  };

  const closeForm = () => {
    if (isSubmitting) return;
    setFormMode(null);
    setEditing(null);
    setFormError("");
  };

  const saveAnnouncement = async () => {
    const title = form.title.trim();
    const body = form.body.trim();
    if (!title) {
      setFormError("Title is required.");
      return;
    }
    if (!body) {
      setFormError("Body is required.");
      return;
    }

    const publishAt = toIsoDateTime(form.publishAt);
    if (form.publishAt && !publishAt) {
      setFormError("Publish at must be a valid datetime.");
      return;
    }

    const payload: Record<string, unknown> = {
      title,
      body,
      target_audience: form.targetAudience,
      is_published: form.isPublished,
      publish_at: publishAt,
      cohort_id: form.cohortId === "none" ? null : Number(form.cohortId),
    };

    setIsSubmitting(true);
    setFormError("");
    setError("");

    try {
      if (formMode === "create") {
        await api<AnnouncementRow>("/announcements", { method: "POST", body: JSON.stringify(payload) });
        showToast("success", "Announcement created successfully.");
      } else if (formMode === "edit" && editing) {
        await api<AnnouncementRow>(`/announcements/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showToast("success", "Announcement updated successfully.");
      }

      setFormMode(null);
      setEditing(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to save announcement." : "Failed to save announcement.";
      setFormError(message);
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setError("");

    try {
      await api<{ id: number }>(`/announcements/${deleteTarget.id}`, { method: "DELETE" });
      showToast("success", "Announcement deleted successfully.");
      setDeleteTarget(null);
      setSelected(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to delete announcement." : "Failed to delete announcement.";
      setError(message);
      showToast("error", message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openMobileFilters = () => {
    setShowFiltersMobile(true);
    setFilterSheetOffset(0);
    filterOffsetRef.current = 0;
  };

  const closeMobileFilters = () => {
    setShowFiltersMobile(false);
    setIsFilterDragging(false);
    setFilterSheetOffset(0);
    filterOffsetRef.current = 0;
    filterDragStartYRef.current = null;
  };

  const handleFilterDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    filterDragStartYRef.current = event.clientY;
    setIsFilterDragging(true);
  };

  useEffect(() => {
    if (!isFilterDragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (filterDragStartYRef.current === null) return;
      const delta = Math.max(0, event.clientY - filterDragStartYRef.current);
      filterOffsetRef.current = delta;
      setFilterSheetOffset(delta);
    };

    const handlePointerUp = () => {
      const shouldClose = filterOffsetRef.current > 130;
      setIsFilterDragging(false);
      filterDragStartYRef.current = null;
      if (shouldClose) {
        closeMobileFilters();
        return;
      }
      filterOffsetRef.current = 0;
      setFilterSheetOffset(0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isFilterDragging]);

  useEffect(() => {
    if (!showFiltersMobile) return;

    const mediaQuery = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = () => {
      if (mediaQuery.matches) closeMobileFilters();
    };

    closeOnDesktop();
    mediaQuery.addEventListener("change", closeOnDesktop);
    return () => {
      mediaQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [showFiltersMobile]);

  const totalPagesSafe = Math.max(pagination.totalPages, 1);
  const publishedCount = filteredRows.filter((item) => item.is_published).length;
  const draftCount = filteredRows.filter((item) => !item.is_published).length;
  const latestCreated = filteredRows[0]?.created_at ?? "";

  return (
    <PageShell
      title="Announcements"
      subtitle="Create, publish, and maintain audience-targeted announcements."
      actions={
        <button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={openCreate}>
          Add Announcement
        </button>
      }
    >
      <div className="dh-page">
        <div className="stats-grid stats-grid--compact dh-stats">
          <Card className="stats-card">
            <p className="stats-card__label">Published (Page)</p>
            <p className="stats-card__value">{publishedCount}</p>
            <p className="stats-card__hint">Visible announcements</p>
          </Card>
          <Card className="stats-card">
            <p className="stats-card__label">Draft (Page)</p>
            <p className="stats-card__value">{draftCount}</p>
            <p className="stats-card__hint">Unpublished records</p>
          </Card>
          <Card className="stats-card">
            <p className="stats-card__label">Latest Created</p>
            <p className="stats-card__value" style={{ fontSize: "1.1rem" }}>
              {latestCreated ? formatDateTime(latestCreated) : "No records"}
            </p>
            <p className="stats-card__hint">Most recent row in current list</p>
          </Card>
        </div>

        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar
              className="dh-form-grid dh-form-grid--announcements"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search announcement title or body"
              selects={[
                {
                  label: "Audience",
                  value: audienceFilter,
                  options: [
                    { label: "All Audiences", value: "all" },
                    { label: "Website", value: "website" },
                    { label: "Admin", value: "admin" },
                  ],
                  onChange: setAudienceFilter,
                },
                {
                  label: "Published",
                  value: publishedFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Published", value: "true" },
                    { label: "Draft", value: "false" },
                  ],
                  onChange: (value) => setPublishedFilter(value as "all" | "true" | "false"),
                },
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Created At", value: "created_at" },
                    { label: "Publish At", value: "publish_at" },
                  ],
                  onChange: (value) => setSortBy(value as SortBy),
                },
                {
                  label: "Sort Order",
                  value: sortOrder,
                  options: [
                    { label: "Descending", value: "desc" },
                    { label: "Ascending", value: "asc" },
                  ],
                  onChange: (value) => setSortOrder(value as "asc" | "desc"),
                },
              ]}
            />
          </div>
          <div className="dh-filters-mobile-bar">
            <button
              className={`btn btn--secondary dh-btn dh-filters-toggle ${showFiltersMobile ? "dh-filters-toggle--active" : ""}`}
              type="button"
              onClick={openMobileFilters}
              aria-expanded={showFiltersMobile}
              aria-controls="announcements-filters-mobile-panel"
            >
              <span className="dh-filters-toggle__label">Filter</span>
            </button>
          </div>
        </div>

        {error ? (
          <Card>
            <p className="alert alert--error dh-alert">{error}</p>
          </Card>
        ) : null}

        {!loading ? (
          <Card className="card--table desktop-only dh-table-wrap">
            <Table<AnnouncementRow>
              rows={filteredRows}
              rowKey={(row) => row.id}
              emptyMessage="No announcements found. Try changing filters or search."
              columns={[
                {
                  key: "title",
                  label: "Title",
                  className: "table-cell-strong",
                  render: (row) => (
                    <button className="program-title-btn" type="button" onClick={() => setSelected(row)}>
                      {row.title}
                    </button>
                  ),
                },
                { key: "audience", label: "Audience", render: (row) => <Badge tone="default">{row.target_audience}</Badge> },
                {
                  key: "published",
                  label: "Published",
                  render: (row) => (
                    <Badge tone={row.is_published ? "published" : "draft"}>{row.is_published ? "published" : "draft"}</Badge>
                  ),
                },
                { key: "publish_at", label: "Publish At", render: (row) => (row.publish_at ? formatDateTime(row.publish_at) : "N/A") },
                { key: "cohort", label: "Cohort", render: (row) => getCohortLabel(row.cohort_id) },
                { key: "created_at", label: "Created At", render: (row) => formatDateTime(row.created_at) },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="table-actions dh-table-actions">
                      <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => setSelected(row)}>View</button>
                      <button className="btn btn--primary btn--sm dh-btn" type="button" onClick={() => openEdit(row)}>Edit</button>
                      <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>Delete</button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        ) : (
          <Card className="card--table desktop-only dh-table-wrap">
            <div className="program-skeleton-table" aria-hidden>
              <div className="program-skeleton-line program-skeleton-line--lg" />
              <div className="program-skeleton-line" />
              <div className="program-skeleton-line program-skeleton-line--sm" />
              <div className="program-skeleton-line" />
            </div>
          </Card>
        )}

        {!loading ? (
          <div className="mobile-only programs-mobile-list">
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <article className="program-mobile-item announcement-mobile-item" key={row.id}>
                  <button className="program-mobile-item__title" type="button" onClick={() => setSelected(row)}>{row.title}</button>
                  <p className="info-text announcement-mobile-item__meta"><strong>Audience:</strong> {row.target_audience}</p>
                  <p className="info-text announcement-mobile-item__meta"><strong>Published:</strong> {row.is_published ? "Yes" : "No"}</p>
                  <p className="info-text announcement-mobile-item__meta"><strong>Publish At:</strong> {row.publish_at ? formatDateTime(row.publish_at) : "N/A"}</p>
                  <div className="table-actions program-mobile-item__actions announcement-mobile-item__actions">
                    <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => setSelected(row)}>View</button>
                    <button className="btn btn--primary btn--sm dh-btn" type="button" onClick={() => openEdit(row)}>Edit</button>
                    <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>Delete</button>
                  </div>
                </article>
              ))
            ) : (
              <Card>
                <div className="empty-state">
                  <p className="empty-state__title">No announcements found</p>
                  <p className="empty-state__description">Try removing filters or using a broader search.</p>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="mobile-only programs-mobile-list">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index}>
                <div className="program-skeleton-card" aria-hidden>
                  <div className="program-skeleton-line program-skeleton-line--md" />
                  <div className="program-skeleton-line program-skeleton-line--sm" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && pagination.total > 0 ? (
          <Card>
            <Pagination page={pagination.page} totalPages={totalPagesSafe} onChange={setPage} />
          </Card>
        ) : null}
      </div>

      {selected ? (
        <div className="modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setSelected(null)}>X</button>
              <h3 className="modal-title">Announcement Details</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line"><strong>Title:</strong> {selected.title}</p>
              <p className="post-details__line"><strong>Audience:</strong> {selected.target_audience}</p>
              <p className="post-details__line"><strong>Published:</strong> {selected.is_published ? "Yes" : "No"}</p>
              <p className="post-details__line"><strong>Publish At:</strong> {selected.publish_at ? formatDateTime(selected.publish_at) : "N/A"}</p>
              <p className="post-details__line"><strong>Cohort:</strong> {getCohortLabel(selected.cohort_id)}</p>
              <p className="post-details__line"><strong>Body:</strong> {selected.body}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => { openEdit(selected); setSelected(null); }}>Edit</button>
              <button className="btn btn--danger" type="button" onClick={() => { setDeleteTarget(selected); setSelected(null); }}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {formMode ? (
        <div className="modal-overlay" role="presentation" onClick={closeForm}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={closeForm}>X</button>
              <h3 className="modal-title">{formMode === "create" ? "Add Announcement" : "Edit Announcement"}</h3>
            </header>
            <div className="form-stack">
              <label className="field"><span className="field__label">Title</span><input className="field__control" type="text" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
              <label className="field"><span className="field__label">Body</span><textarea className="textarea-control" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></label>
              <div className="announcement-form-grid">
                <label className="field"><span className="field__label">Audience</span><select className="field__control" value={form.targetAudience} onChange={(event) => setForm((current) => ({ ...current, targetAudience: event.target.value as Audience }))}><option value="all">All</option><option value="website">Website</option><option value="admin">Admin</option></select></label>
                <label className="field"><span className="field__label">Cohort (optional)</span><select className="field__control" value={form.cohortId} onChange={(event) => setForm((current) => ({ ...current, cohortId: event.target.value }))}><option value="none">General</option>{cohorts.map((cohort) => <option value={cohort.id} key={cohort.id}>{cohort.name}</option>)}</select></label>
                <label className="field"><span className="field__label">Publish At (optional)</span><input className="field__control" type="datetime-local" value={form.publishAt} onChange={(event) => setForm((current) => ({ ...current, publishAt: event.target.value }))} /></label>
                <label className="field announcement-form-switch"><span className="field__label">Published</span><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))} /></label>
              </div>
            </div>
            {formError ? <p className="alert alert--error">{formError}</p> : null}
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closeForm} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={saveAnnouncement} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setDeleteTarget(null)}>X</button>
              <h3 className="modal-title">Delete Announcement</h3>
            </header>
            <p className="post-details__line">Delete <strong>{deleteTarget.title}</strong>? This uses soft delete on the server.</p>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</button>
              <button className="btn btn--danger" type="button" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {showFiltersMobile ? (
        <div className="dh-filter-modal" role="presentation" onClick={closeMobileFilters}>
          <div id="announcements-filters-mobile-panel" className={`dh-filter-sheet ${isFilterDragging ? "dh-filter-sheet--dragging" : ""}`} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} style={{ transform: `translateY(${filterSheetOffset}px)` }}>
            <div className="dh-filter-sheet__drag" onPointerDown={handleFilterDragStart}><span className="dh-filter-sheet__grabber" aria-hidden /><p className="dh-filter-sheet__title">Filters</p></div>
            <FilterBar
              className="dh-form-grid dh-form-grid--mobile"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search announcement title or body"
              selects={[
                { label: "Audience", value: audienceFilter, options: [{ label: "All Audiences", value: "all" }, { label: "Website", value: "website" }, { label: "Admin", value: "admin" }], onChange: setAudienceFilter },
                { label: "Published", value: publishedFilter, options: [{ label: "All", value: "all" }, { label: "Published", value: "true" }, { label: "Draft", value: "false" }], onChange: (value) => setPublishedFilter(value as "all" | "true" | "false") },
                { label: "Sort By", value: sortBy, options: [{ label: "Created At", value: "created_at" }, { label: "Publish At", value: "publish_at" }], onChange: (value) => setSortBy(value as SortBy) },
                { label: "Sort Order", value: sortOrder, options: [{ label: "Descending", value: "desc" }, { label: "Ascending", value: "asc" }], onChange: (value) => setSortOrder(value as "asc" | "desc") },
              ]}
            />
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PageShell>
  );
}





