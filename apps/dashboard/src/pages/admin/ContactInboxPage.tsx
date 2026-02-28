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

type ContactKind = "question" | "feedback" | "visit_request";
type ContactStatus = "new" | "in_progress" | "resolved";
type SortBy = "created_at" | "status" | "last_replied_at";
type ToastTone = "success" | "error";

type ContactRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  kind: ContactKind;
  company_name: string | null;
  company_role: string | null;
  visit_preferred_dates: string | null;
  visit_notes: string | null;
  status: ContactStatus;
  assigned_to: number | null;
  last_replied_at: string | null;
  created_at: string;
  resolved_at: string | null;
};

const defaultPagination: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export function ContactInboxPage() {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | ContactKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ContactStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<ContactRow | null>(null);
  const [replyTarget, setReplyTarget] = useState<ContactRow | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [detailStatus, setDetailStatus] = useState<ContactStatus>("new");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [filterSheetOffset, setFilterSheetOffset] = useState(0);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [toastId, setToastId] = useState(1);
  const filterDragStartYRef = useRef<number | null>(null);
  const filterOffsetRef = useRef(0);

  const pushToast = (tone: ToastTone, message: string) => {
    const id = toastId;
    setToastId((current) => current + 1);
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, kindFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiList<ContactRow>(
          `/contact${buildQueryString({
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            kind: kindFilter === "all" ? undefined : kindFilter,
            sortBy,
            order: sortOrder,
          })}`,
        );

        if (!active) {
          return;
        }

        setRows(result.data);
        setPagination(result.pagination);
      } catch (err) {
        if (!active) {
          return;
        }

        const message = err instanceof ApiError ? err.message || "Failed to load contact inbox." : "Failed to load contact inbox.";
        setError(message);
        pushToast("error", message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [debouncedSearch, kindFilter, page, refreshKey, sortBy, sortOrder, statusFilter]);

  const filteredRows = useMemo(() => {
    if (kindFilter === "all") {
      return rows;
    }

    return rows.filter((row) => row.kind === kindFilter);
  }, [kindFilter, rows]);

  const totalPagesSafe = Math.max(pagination.totalPages, 1);

  const openDetails = (row: ContactRow) => {
    setSelected(row);
    setDetailStatus(row.status);
  };

  const updateStatus = async (row: ContactRow, nextStatus: ContactStatus) => {
    setIsUpdatingStatus(true);
    try {
      await api<ContactRow>(`/contact/${row.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      pushToast("success", "Status updated successfully.");
      if (selected?.id === row.id) {
        setSelected((current) => (current ? { ...current, status: nextStatus } : current));
      }
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to update status." : "Failed to update status.";
      pushToast("error", message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const submitReply = async () => {
    if (!replyTarget) {
      return;
    }

    const trimmed = replyBody.trim();
    if (!trimmed) {
      pushToast("error", "Reply body is required.");
      return;
    }

    setIsReplying(true);
    try {
      await api<{ id: number; reply_message: string }>(`/contact/${replyTarget.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply_message: trimmed }),
      });
      pushToast("success", "Reply saved successfully.");
      setReplyTarget(null);
      setReplyBody("");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to save reply." : "Failed to save reply.";
      pushToast("error", message);
    } finally {
      setIsReplying(false);
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
    if (!isFilterDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (filterDragStartYRef.current === null) {
        return;
      }

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
    if (!showFiltersMobile) {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = () => {
      if (mediaQuery.matches) {
        closeMobileFilters();
      }
    };

    closeOnDesktop();
    mediaQuery.addEventListener("change", closeOnDesktop);

    return () => {
      mediaQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [showFiltersMobile]);

  const renderActions = (row: ContactRow) => (
    <div className="table-actions dh-table-actions">
      <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => openDetails(row)}>
        Open
      </button>
      <button
        className="btn btn--primary btn--sm dh-btn"
        type="button"
        onClick={() => {
          setReplyTarget(row);
          setReplyBody("");
        }}
      >
        Reply
      </button>
      <button
        className="btn btn--secondary btn--sm dh-btn"
        type="button"
        onClick={() => updateStatus(row, row.status === "resolved" ? "in_progress" : "resolved")}
      >
        {row.status === "resolved" ? "Reopen" : "Resolve"}
      </button>
    </div>
  );

  return (
    <PageShell title="Contact Inbox" subtitle="Manage questions, feedback, and visit requests from website visitors.">
      <div className="dh-page">
        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar
              className="dh-form-grid dh-form-grid--contact"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search name, email, subject, or message"
              selects={[
                {
                  label: "Kind",
                  value: kindFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Question", value: "question" },
                    { label: "Feedback", value: "feedback" },
                    { label: "Visit Request", value: "visit_request" },
                  ],
                  onChange: (value) => setKindFilter(value as "all" | ContactKind),
                },
                {
                  label: "Status",
                  value: statusFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "New", value: "new" },
                    { label: "In Progress", value: "in_progress" },
                    { label: "Resolved", value: "resolved" },
                  ],
                  onChange: (value) => setStatusFilter(value as "all" | ContactStatus),
                },
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Created At", value: "created_at" },
                    { label: "Status", value: "status" },
                    { label: "Last Replied", value: "last_replied_at" },
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
              aria-controls="contact-filters-mobile-panel"
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

        {loading ? (
          <>
            <Card className="card--table desktop-only dh-table-wrap">
              <div className="program-skeleton-table" aria-hidden>
                <div className="program-skeleton-line program-skeleton-line--lg" />
                <div className="program-skeleton-line" />
                <div className="program-skeleton-line program-skeleton-line--sm" />
              </div>
            </Card>
            <div className="mobile-only programs-mobile-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <div className="program-skeleton-card" aria-hidden>
                    <div className="program-skeleton-line program-skeleton-line--md" />
                    <div className="program-skeleton-line program-skeleton-line--sm" />
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : null}

        {!loading ? (
          <Card className="card--table desktop-only dh-table-wrap">
            <Table<ContactRow>
              rows={filteredRows}
              rowKey={(row) => row.id}
              emptyMessage="No contact messages found."
              columns={[
                {
                  key: "name",
                  label: "Name",
                  className: "table-cell-strong",
                  render: (row) => row.name,
                },
                {
                  key: "email",
                  label: "Email",
                  render: (row) => row.email,
                },
                {
                  key: "kind",
                  label: "Kind",
                  render: (row) => <Badge tone="default">{row.kind}</Badge>,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => <Badge tone={row.status}>{row.status}</Badge>,
                },
                {
                  key: "created",
                  label: "Created",
                  render: (row) => formatDateTime(row.created_at),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => renderActions(row),
                },
              ]}
            />
          </Card>
        ) : null}

        {!loading ? (
          <div className="mobile-only programs-mobile-list">
            {filteredRows.length ? (
              filteredRows.map((row) => (
                <article className="program-mobile-item" key={row.id}>
                  <h3 className="program-mobile-item__title">{row.name}</h3>
                  <p className="info-text">
                    <strong>Email:</strong> {row.email}
                  </p>
                  <p className="info-text">
                    <strong>Kind:</strong> {row.kind}
                  </p>
                  <p className="info-text">
                    <strong>Status:</strong> {row.status}
                  </p>
                  <p className="info-text info-text--small">{formatDateTime(row.created_at)}</p>
                  {renderActions(row)}
                </article>
              ))
            ) : (
              <Card>
                <div className="empty-state">
                  <p className="empty-state__title">No messages found</p>
                  <p className="empty-state__description">No messages match current filters.</p>
                </div>
              </Card>
            )}
          </div>
        ) : null}

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
              <h3 className="modal-title">Message Details</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line">
                <strong>Name:</strong> {selected.name}
              </p>
              <p className="post-details__line">
                <strong>Email:</strong> {selected.email}
              </p>
              <p className="post-details__line">
                <strong>Phone:</strong> {selected.phone || "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Kind:</strong> {selected.kind}
              </p>
              <p className="post-details__line">
                <strong>Subject:</strong> {selected.subject || "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Message:</strong> {selected.message}
              </p>
              <p className="post-details__line">
                <strong>Created:</strong> {formatDateTime(selected.created_at)}
              </p>
              <p className="post-details__line">
                <strong>Last Replied:</strong> {selected.last_replied_at ? formatDateTime(selected.last_replied_at) : "N/A"}
              </p>
              {selected.kind === "visit_request" ? (
                <>
                  <p className="post-details__line">
                    <strong>Company:</strong> {selected.company_name || "N/A"}
                  </p>
                  <p className="post-details__line">
                    <strong>Company Role:</strong> {selected.company_role || "N/A"}
                  </p>
                  <p className="post-details__line">
                    <strong>Preferred Dates:</strong> {selected.visit_preferred_dates || "N/A"}
                  </p>
                  <p className="post-details__line">
                    <strong>Visit Notes:</strong> {selected.visit_notes || "N/A"}
                  </p>
                </>
              ) : null}
            </div>
            <div className="form-stack">
              <label className="field">
                <span className="field__label">Update Status</span>
                <select className="field__control" value={detailStatus} onChange={(event) => setDetailStatus(event.target.value as ContactStatus)}>
                  <option value="new">new</option>
                  <option value="in_progress">in_progress</option>
                  <option value="resolved">resolved</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setSelected(null)}>
                Close
              </button>
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => void updateStatus(selected, detailStatus)}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? "Saving..." : "Save Status"}
              </button>
              <button
                className="btn btn--secondary"
                type="button"
                onClick={() => {
                  setReplyTarget(selected);
                  setReplyBody("");
                  setSelected(null);
                }}
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {replyTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => setReplyTarget(null)}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Reply to {replyTarget.name}</h3>
            </header>
            <label className="field">
              <span className="field__label">Reply Body</span>
              <textarea className="textarea-control" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} />
            </label>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setReplyTarget(null)} disabled={isReplying}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={submitReply} disabled={isReplying}>
                {isReplying ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFiltersMobile ? (
        <div className="dh-filter-modal" role="presentation" onClick={closeMobileFilters}>
          <div
            id="contact-filters-mobile-panel"
            className={`dh-filter-sheet ${isFilterDragging ? "dh-filter-sheet--dragging" : ""}`}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ transform: `translateY(${filterSheetOffset}px)` }}
          >
            <div className="dh-filter-sheet__drag" onPointerDown={handleFilterDragStart}>
              <span className="dh-filter-sheet__grabber" aria-hidden />
              <p className="dh-filter-sheet__title">Filters</p>
            </div>
            <FilterBar
              className="dh-form-grid dh-form-grid--mobile"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search name, email, subject, or message"
              selects={[
                {
                  label: "Kind",
                  value: kindFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Question", value: "question" },
                    { label: "Feedback", value: "feedback" },
                    { label: "Visit Request", value: "visit_request" },
                  ],
                  onChange: (value) => setKindFilter(value as "all" | ContactKind),
                },
                {
                  label: "Status",
                  value: statusFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "New", value: "new" },
                    { label: "In Progress", value: "in_progress" },
                    { label: "Resolved", value: "resolved" },
                  ],
                  onChange: (value) => setStatusFilter(value as "all" | ContactStatus),
                },
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Created At", value: "created_at" },
                    { label: "Status", value: "status" },
                    { label: "Last Replied", value: "last_replied_at" },
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
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PageShell>
  );
}



