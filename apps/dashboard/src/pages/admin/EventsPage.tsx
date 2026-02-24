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

type SortBy = "starts_at" | "title" | "created_at";
type FormMode = "create" | "edit" | null;
type ToastTone = "success" | "error";

type EventRow = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  is_published: boolean;
  is_done: boolean;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

type EventFormState = {
  slug: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
};

const defaultPagination: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };
const initialForm: EventFormState = {
  slug: "",
  title: "",
  description: "",
  location: "",
  startsAt: "",
  endsAt: "",
  isPublished: false,
};

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

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

function toFormState(item: EventRow | null): EventFormState {
  if (!item) return initialForm;
  return {
    slug: item.slug,
    title: item.title,
    description: item.description ?? "",
    location: item.location ?? "",
    startsAt: toDateTimeInputValue(item.starts_at),
    endsAt: toDateTimeInputValue(item.ends_at),
    isPublished: item.is_published,
  };
}

export function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [publishedFilter, setPublishedFilter] = useState<"all" | "true" | "false">("all");
  const [doneFilter, setDoneFilter] = useState<"all" | "true" | "false">("all");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("starts_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState<EventFormState>(initialForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [markDoneTarget, setMarkDoneTarget] = useState<EventRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
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
  }, [debouncedSearch, doneFilter, publishedFilter, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const status = doneFilter === "all" ? undefined : doneFilter === "true" ? "done" : "upcoming";
        const result = await apiList<EventRow>(
          `/events${buildQueryString({ page, limit: 10, search: debouncedSearch || undefined, status, sortBy, order: sortOrder })}`,
        );

        if (!active) return;
        setEvents(result.data);
        setPagination(result.pagination);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message || "Failed to load events." : "Failed to load events.";
        setError(message);
        showToast("error", message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadEvents();
    return () => {
      active = false;
    };
  }, [debouncedSearch, doneFilter, page, refreshKey, sortBy, sortOrder]);

  const filteredRows = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => {
      if (publishedFilter !== "all" && String(event.is_published) !== publishedFilter) return false;
      if (upcomingOnly) {
        const start = new Date(event.starts_at).getTime();
        if (Number.isNaN(start) || start < now) return false;
      }
      return true;
    });
  }, [events, publishedFilter, upcomingOnly]);

  const openCreate = () => {
    setFormMode("create");
    setEditing(null);
    setForm(initialForm);
    setFormError("");
    setError("");
  };

  const openEdit = (item: EventRow) => {
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

  const saveEvent = async () => {
    const title = form.title.trim();
    const startsAt = toIsoDateTime(form.startsAt);
    const endsAt = toIsoDateTime(form.endsAt);
    const slug = slugify(form.slug.trim() || title);

    if (!title) {
      setFormError("Title is required.");
      return;
    }
    if (!slug) {
      setFormError("Slug is required.");
      return;
    }
    if (!startsAt) {
      setFormError("Start datetime is required.");
      return;
    }
    if (form.endsAt && !endsAt) {
      setFormError("End datetime is invalid.");
      return;
    }
    if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      setFormError("End datetime must be after or equal to start datetime.");
      return;
    }

    const payload: Record<string, unknown> = {
      slug,
      title,
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      starts_at: startsAt,
      ends_at: endsAt,
      is_published: form.isPublished,
    };

    setIsSubmitting(true);
    setFormError("");
    setError("");

    try {
      if (formMode === "create") {
        await api<EventRow>("/events", { method: "POST", body: JSON.stringify(payload) });
        showToast("success", "Event created successfully.");
      } else if (formMode === "edit" && editing) {
        await api<EventRow>(`/events/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast("success", "Event updated successfully.");
      }
      setFormMode(null);
      setEditing(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to save event." : "Failed to save event.";
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
      await api<{ id: number }>(`/events/${deleteTarget.id}`, { method: "DELETE" });
      showToast("success", "Event deleted successfully.");
      setDeleteTarget(null);
      setSelected(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to delete event." : "Failed to delete event.";
      setError(message);
      showToast("error", message);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmMarkDone = async () => {
    if (!markDoneTarget) return;
    setIsMarkingDone(true);
    setError("");
    try {
      await api<EventRow>(`/events/${markDoneTarget.id}/mark-done`, { method: "PATCH" });
      showToast("success", "Event marked as done.");
      setMarkDoneTarget(null);
      setSelected(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to mark event done." : "Failed to mark event done.";
      setError(message);
      showToast("error", message);
    } finally {
      setIsMarkingDone(false);
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
  const doneCount = filteredRows.filter((item) => item.is_done).length;
  const publishedCount = filteredRows.filter((item) => item.is_published).length;

  return (
    <PageShell
      title="Events"
      subtitle="Manage events with publishing and completion workflow."
      actions={<button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={openCreate}>Add Event</button>}
    >
      <div className="dh-page">
        <div className="stats-grid stats-grid--compact dh-stats">
          <Card className="stats-card"><p className="stats-card__label">Published (Page)</p><p className="stats-card__value">{publishedCount}</p><p className="stats-card__hint">Visible events</p></Card>
          <Card className="stats-card"><p className="stats-card__label">Done (Page)</p><p className="stats-card__value">{doneCount}</p><p className="stats-card__hint">Completed events</p></Card>
          <Card className="stats-card"><p className="stats-card__label">Total (Page)</p><p className="stats-card__value">{filteredRows.length}</p><p className="stats-card__hint">Rows after client filters</p></Card>
        </div>

        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar
              className="dh-form-grid dh-form-grid--events"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title, description, or location"
              selects={[
                { label: "Published", value: publishedFilter, options: [{ label: "All", value: "all" }, { label: "Published", value: "true" }, { label: "Unpublished", value: "false" }], onChange: (value) => setPublishedFilter(value as "all" | "true" | "false") },
                { label: "Done", value: doneFilter, options: [{ label: "All", value: "all" }, { label: "Done", value: "true" }, { label: "Not Done", value: "false" }], onChange: (value) => setDoneFilter(value as "all" | "true" | "false") },
                { label: "Sort By", value: sortBy, options: [{ label: "Starts At", value: "starts_at" }, { label: "Title", value: "title" }, { label: "Created At", value: "created_at" }], onChange: (value) => setSortBy(value as SortBy) },
                { label: "Sort Order", value: sortOrder, options: [{ label: "Descending", value: "desc" }, { label: "Ascending", value: "asc" }], onChange: (value) => setSortOrder(value as "asc" | "desc") },
              ]}
              extra={<label className="field event-upcoming-toggle"><span className="field__label">Upcoming only</span><input type="checkbox" checked={upcomingOnly} onChange={(event) => setUpcomingOnly(event.target.checked)} /></label>}
            />
          </div>
          <div className="dh-filters-mobile-bar">
            <button className={`btn btn--secondary dh-btn dh-filters-toggle ${showFiltersMobile ? "dh-filters-toggle--active" : ""}`} type="button" onClick={openMobileFilters} aria-expanded={showFiltersMobile} aria-controls="events-filters-mobile-panel"><span className="dh-filters-toggle__label">Filter</span></button>
          </div>
        </div>

        {error ? <Card><p className="alert alert--error dh-alert">{error}</p></Card> : null}

        {!loading ? (
          <Card className="card--table desktop-only dh-table-wrap">
            <Table<EventRow>
              rows={filteredRows}
              rowKey={(row) => row.id}
              emptyMessage="No events found. Try changing filters or search."
              columns={[
                { key: "title", label: "Title", className: "table-cell-strong", render: (row) => <button className="program-title-btn" type="button" onClick={() => setSelected(row)}>{row.title}</button> },
                { key: "starts", label: "Starts", render: (row) => formatDateTime(row.starts_at) },
                { key: "ends", label: "Ends", render: (row) => (row.ends_at ? formatDateTime(row.ends_at) : "N/A") },
                { key: "published", label: "Published", render: (row) => <Badge tone={row.is_published ? "published" : "unpublished"}>{row.is_published ? "published" : "unpublished"}</Badge> },
                { key: "done", label: "Done", render: (row) => <Badge tone={row.is_done ? "done" : "pending"}>{row.is_done ? "done" : "pending"}</Badge> },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="table-actions dh-table-actions">
                      <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => setSelected(row)}>View</button>
                      <button className="btn btn--primary btn--sm dh-btn" type="button" onClick={() => openEdit(row)}>Edit</button>
                      <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>Delete</button>
                      <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => setMarkDoneTarget(row)} disabled={row.is_done}>Mark Done</button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        ) : (
          <Card className="card--table desktop-only dh-table-wrap"><div className="program-skeleton-table" aria-hidden><div className="program-skeleton-line program-skeleton-line--lg" /><div className="program-skeleton-line" /><div className="program-skeleton-line program-skeleton-line--sm" /><div className="program-skeleton-line" /></div></Card>
        )}

        {!loading ? (
          <div className="mobile-only programs-mobile-list">
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <article className="program-mobile-item event-mobile-item" key={row.id}>
                  <button className="program-mobile-item__title" type="button" onClick={() => setSelected(row)}>{row.title}</button>
                  <p className="info-text event-mobile-item__meta"><strong>Starts:</strong> {formatDateTime(row.starts_at)}</p>
                  <p className="info-text event-mobile-item__meta"><strong>Ends:</strong> {row.ends_at ? formatDateTime(row.ends_at) : "N/A"}</p>
                  <p className="info-text event-mobile-item__meta"><strong>Location:</strong> {row.location || "N/A"}</p>
                  <div className="table-actions program-mobile-item__actions event-mobile-item__actions">
                    <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => setSelected(row)}>View</button>
                    <button className="btn btn--primary btn--sm dh-btn" type="button" onClick={() => openEdit(row)}>Edit</button>
                    <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>Delete</button>
                    <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => setMarkDoneTarget(row)} disabled={row.is_done}>Done</button>
                  </div>
                </article>
              ))
            ) : (
              <Card><div className="empty-state"><p className="empty-state__title">No events found</p><p className="empty-state__description">Try removing filters or using a broader search.</p></div></Card>
            )}
          </div>
        ) : (
          <div className="mobile-only programs-mobile-list">{Array.from({ length: 2 }).map((_, index) => <Card key={index}><div className="program-skeleton-card" aria-hidden><div className="program-skeleton-line program-skeleton-line--md" /><div className="program-skeleton-line program-skeleton-line--sm" /></div></Card>)}</div>
        )}

        {!loading && pagination.total > 0 ? <Card><Pagination page={pagination.page} totalPages={totalPagesSafe} onChange={setPage} /></Card> : null}
      </div>

      {selected ? (
        <div className="modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setSelected(null)}>X</button>
              <h3 className="modal-title">Event Details</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line"><strong>Title:</strong> {selected.title}</p>
              <p className="post-details__line"><strong>Slug:</strong> {selected.slug}</p>
              <p className="post-details__line"><strong>Description:</strong> {selected.description || "N/A"}</p>
              <p className="post-details__line"><strong>Location:</strong> {selected.location || "N/A"}</p>
              <p className="post-details__line"><strong>Starts:</strong> {formatDateTime(selected.starts_at)}</p>
              <p className="post-details__line"><strong>Ends:</strong> {selected.ends_at ? formatDateTime(selected.ends_at) : "N/A"}</p>
              <p className="post-details__line"><strong>Published:</strong> {selected.is_published ? "Yes" : "No"}</p>
              <p className="post-details__line"><strong>Done:</strong> {selected.is_done ? "Yes" : "No"}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => { openEdit(selected); setSelected(null); }}>Edit</button>
              <button className="btn btn--danger" type="button" onClick={() => { setDeleteTarget(selected); setSelected(null); }}>Delete</button>
              <button className="btn btn--primary" type="button" onClick={() => { setMarkDoneTarget(selected); setSelected(null); }} disabled={selected.is_done}>Mark Done</button>
            </div>
          </div>
        </div>
      ) : null}

      {formMode ? (
        <div className="modal-overlay" role="presentation" onClick={closeForm}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={closeForm}>X</button>
              <h3 className="modal-title">{formMode === "create" ? "Add Event" : "Edit Event"}</h3>
            </header>
            <div className="form-stack">
              <label className="field"><span className="field__label">Title</span><input className="field__control" type="text" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
              <label className="field"><span className="field__label">Slug</span><input className="field__control" type="text" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="Leave blank to auto-generate from title" /></label>
              <label className="field"><span className="field__label">Description</span><textarea className="textarea-control" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <label className="field"><span className="field__label">Location</span><input className="field__control" type="text" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} /></label>
              <div className="event-form-grid">
                <label className="field"><span className="field__label">Starts At</span><input className="field__control" type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} /></label>
                <label className="field"><span className="field__label">Ends At</span><input className="field__control" type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} /></label>
                <label className="field event-form-switch"><span className="field__label">Published</span><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))} /></label>
              </div>
            </div>
            {formError ? <p className="alert alert--error">{formError}</p> : null}
            <div className="modal-actions"><button className="btn btn--secondary" type="button" onClick={closeForm} disabled={isSubmitting}>Cancel</button><button className="btn btn--primary" type="button" onClick={saveEvent} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</button></div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setDeleteTarget(null)}>X</button>
              <h3 className="modal-title">Delete Event</h3>
            </header>
            <p className="post-details__line">Delete <strong>{deleteTarget.title}</strong>? This uses soft delete on the server.</p>
            <div className="modal-actions"><button className="btn btn--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</button><button className="btn btn--danger" type="button" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete"}</button></div>
          </div>
        </div>
      ) : null}

      {markDoneTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => setMarkDoneTarget(null)}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setMarkDoneTarget(null)}>X</button>
              <h3 className="modal-title">Mark Event Done</h3>
            </header>
            <p className="post-details__line">Mark <strong>{markDoneTarget.title}</strong> as completed?</p>
            <div className="modal-actions"><button className="btn btn--secondary" type="button" onClick={() => setMarkDoneTarget(null)} disabled={isMarkingDone}>Cancel</button><button className="btn btn--primary" type="button" onClick={confirmMarkDone} disabled={isMarkingDone}>{isMarkingDone ? "Updating..." : "Mark Done"}</button></div>
          </div>
        </div>
      ) : null}

      {showFiltersMobile ? (
        <div className="dh-filter-modal" role="presentation" onClick={closeMobileFilters}>
          <div id="events-filters-mobile-panel" className={`dh-filter-sheet ${isFilterDragging ? "dh-filter-sheet--dragging" : ""}`} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} style={{ transform: `translateY(${filterSheetOffset}px)` }}>
            <div className="dh-filter-sheet__drag" onPointerDown={handleFilterDragStart}><span className="dh-filter-sheet__grabber" aria-hidden /><p className="dh-filter-sheet__title">Filters</p></div>
            <FilterBar
              className="dh-form-grid dh-form-grid--mobile"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search title, description, or location"
              selects={[
                { label: "Published", value: publishedFilter, options: [{ label: "All", value: "all" }, { label: "Published", value: "true" }, { label: "Unpublished", value: "false" }], onChange: (value) => setPublishedFilter(value as "all" | "true" | "false") },
                { label: "Done", value: doneFilter, options: [{ label: "All", value: "all" }, { label: "Done", value: "true" }, { label: "Not Done", value: "false" }], onChange: (value) => setDoneFilter(value as "all" | "true" | "false") },
                { label: "Sort By", value: sortBy, options: [{ label: "Starts At", value: "starts_at" }, { label: "Title", value: "title" }, { label: "Created At", value: "created_at" }], onChange: (value) => setSortBy(value as SortBy) },
                { label: "Sort Order", value: sortOrder, options: [{ label: "Descending", value: "desc" }, { label: "Ascending", value: "asc" }], onChange: (value) => setSortOrder(value as "asc" | "desc") },
              ]}
              extra={<label className="field event-upcoming-toggle"><span className="field__label">Upcoming only</span><input type="checkbox" checked={upcomingOnly} onChange={(event) => setUpcomingOnly(event.target.checked)} /></label>}
            />
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PageShell>
  );
}





