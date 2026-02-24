import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { ApiError, apiList, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";

type LogRow = {
  id: number;
  actor_user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  message: string;
  metadata: unknown;
  created_at: string;
};

type SortBy = "created_at" | "action" | "entity_type" | "actor_user_id";
type ToastTone = "success" | "error";

const defaultPagination: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

function toIsoDate(value: string, endOfDay = false): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date.toISOString();
}

function toJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value);
  }
}

export function ActivityLogsPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<LogRow | null>(null);
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
  }, [debouncedSearch, action, entityType, actorUserId, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiList<LogRow>(
          `/logs${buildQueryString({
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            action: action.trim() || undefined,
            entity_type: entityType.trim() || undefined,
            actor_user_id: actorUserId.trim() || undefined,
            date_from: toIsoDate(dateFrom),
            date_to: toIsoDate(dateTo, true),
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

        const message = err instanceof ApiError ? err.message || "Failed to load activity logs." : "Failed to load activity logs.";
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
  }, [action, actorUserId, dateFrom, dateTo, debouncedSearch, entityType, page, sortBy, sortOrder]);

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

  const totalPagesSafe = Math.max(pagination.totalPages, 1);

  const filterFields = useMemo(
    () => (
      <>
        <label className="field">
          <span className="field__label">Action</span>
          <input className="field__control" type="text" value={action} onChange={(event) => setAction(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Entity Type</span>
          <input className="field__control" type="text" value={entityType} onChange={(event) => setEntityType(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Actor User ID</span>
          <input className="field__control" type="text" value={actorUserId} onChange={(event) => setActorUserId(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Date From</span>
          <input className="field__control" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Date To</span>
          <input className="field__control" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
      </>
    ),
    [action, actorUserId, dateFrom, dateTo, entityType],
  );

  return (
    <PageShell title="Activity Logs" subtitle="Audit all admin actions with detailed metadata.">
      <div className="dh-page">
        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar
              className="dh-form-grid dh-form-grid--logs"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search message, action, or entity"
              selects={[
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Created At", value: "created_at" },
                    { label: "Action", value: "action" },
                    { label: "Entity Type", value: "entity_type" },
                    { label: "Actor User ID", value: "actor_user_id" },
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
              extra={filterFields}
            />
          </div>
          <div className="dh-filters-mobile-bar">
            <button
              className={`btn btn--secondary dh-btn dh-filters-toggle ${showFiltersMobile ? "dh-filters-toggle--active" : ""}`}
              type="button"
              onClick={openMobileFilters}
              aria-expanded={showFiltersMobile}
              aria-controls="logs-filters-mobile-panel"
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
            <Table<LogRow>
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage="No logs found."
              columns={[
                {
                  key: "created",
                  label: "Timestamp",
                  render: (row) => formatDateTime(row.created_at),
                },
                {
                  key: "actor",
                  label: "Actor",
                  render: (row) => (row.actor_user_id === null ? "System" : row.actor_user_id),
                },
                {
                  key: "action",
                  label: "Action",
                  className: "table-cell-strong",
                  render: (row) => row.action,
                },
                {
                  key: "entity",
                  label: "Entity",
                  render: (row) => row.entity_type,
                },
                {
                  key: "message",
                  label: "Message",
                  render: (row) => <p className="program-description-cell">{row.message}</p>,
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="table-actions dh-table-actions">
                      <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => setSelected(row)}>
                        Details
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        ) : null}

        {!loading ? (
          <div className="mobile-only programs-mobile-list">
            {rows.length ? (
              rows.map((row) => (
                <article className="program-mobile-item" key={row.id}>
                  <h3 className="program-mobile-item__title">{row.action}</h3>
                  <p className="info-text">
                    <strong>Entity:</strong> {row.entity_type}
                  </p>
                  <p className="info-text">
                    <strong>Actor:</strong> {row.actor_user_id ?? "System"}
                  </p>
                  <p className="info-text">{row.message}</p>
                  <p className="info-text info-text--small">{formatDateTime(row.created_at)}</p>
                  <div className="table-actions">
                    <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => setSelected(row)}>
                      Details
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <Card>
                <div className="empty-state">
                  <p className="empty-state__title">No logs found</p>
                  <p className="empty-state__description">No activity records match current filters.</p>
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
              <h3 className="modal-title">Log Details</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line">
                <strong>Action:</strong> {selected.action}
              </p>
              <p className="post-details__line">
                <strong>Entity:</strong> {selected.entity_type}
              </p>
              <p className="post-details__line">
                <strong>Entity ID:</strong> {selected.entity_id ?? "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Actor User ID:</strong> {selected.actor_user_id ?? "System"}
              </p>
              <p className="post-details__line">
                <strong>Message:</strong> {selected.message}
              </p>
              <p className="post-details__line">
                <strong>Timestamp:</strong> {formatDateTime(selected.created_at)}
              </p>
              <pre className="metadata-block">{toJson(selected.metadata)}</pre>
            </div>
          </div>
        </div>
      ) : null}

      {showFiltersMobile ? (
        <div className="dh-filter-modal" role="presentation" onClick={closeMobileFilters}>
          <div
            id="logs-filters-mobile-panel"
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
              searchPlaceholder="Search message, action, or entity"
              selects={[
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Created At", value: "created_at" },
                    { label: "Action", value: "action" },
                    { label: "Entity Type", value: "entity_type" },
                    { label: "Actor User ID", value: "actor_user_id" },
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
              extra={filterFields}
            />
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PageShell>
  );
}



