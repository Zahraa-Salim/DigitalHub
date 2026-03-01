import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { ApiError, api, apiList, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { emitNotificationsUpdated } from "../../utils/notifications";
import { buildQueryString } from "../../utils/query";

type NotificationRow = {
  id: number;
  recipient_admin_user_id: number;
  log_id: number | null;
  title: string;
  body: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type ReadFilter = "unread" | "all";
type ToastTone = "success" | "error";

const defaultPagination: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export function NotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [filter, setFilter] = useState<ReadFilter>("unread");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isClearingRead, setIsClearingRead] = useState(false);
  const [isClearingOlderRead, setIsClearingOlderRead] = useState(false);
  const [clearOlderDays, setClearOlderDays] = useState<"7" | "30" | "90">("30");
  const [selected, setSelected] = useState<NotificationRow | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [toastId, setToastId] = useState(1);

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
    setPage(1);
  }, [filter]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiList<NotificationRow>(
          `/notifications${buildQueryString({
            page,
            limit: 10,
            is_read: filter === "all" ? undefined : false,
            sortBy: "created_at",
            order: "desc",
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

        const message = err instanceof ApiError ? err.message || "Failed to load notifications." : "Failed to load notifications.";
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
  }, [filter, page, refreshKey]);

  const unreadCount = useMemo(() => rows.filter((item) => !item.is_read).length, [rows]);
  const totalPagesSafe = Math.max(pagination.totalPages, 1);

  const markOneRead = async (row: NotificationRow, options?: { silent?: boolean; keepOpen?: boolean }) => {
    if (row.is_read) {
      return;
    }

    try {
      await api<NotificationRow>(`/notifications/${row.id}/read`, {
        method: "PATCH",
      });
      emitNotificationsUpdated();
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item)));
      if (options?.keepOpen && selected?.id === row.id) {
        setSelected((current) => (current ? { ...current, is_read: true, read_at: new Date().toISOString() } : current));
      }
      if (!options?.silent) {
        pushToast("success", "Notification marked as read.");
      }
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to mark notification as read." : "Failed to mark notification as read.";
      if (!options?.silent) {
        pushToast("error", message);
      }
    }
  };

  const markAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await api<{ updated: number }>("/notifications/read-all", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      emitNotificationsUpdated();
      pushToast("success", "All notifications marked as read.");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to mark all as read." : "Failed to mark all as read.";
      pushToast("error", message);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const clearRead = async () => {
    setIsClearingRead(true);
    try {
      const result = await api<{ deleted: number }>("/notifications/read", { method: "DELETE" });
      emitNotificationsUpdated();
      pushToast("success", result.deleted ? `${result.deleted} read notifications cleared.` : "No read notifications to clear.");
      setSelected(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to clear read notifications." : "Failed to clear read notifications.";
      pushToast("error", message);
    } finally {
      setIsClearingRead(false);
    }
  };

  const clearReadOlderThan = async () => {
    setIsClearingOlderRead(true);
    try {
      const result = await api<{ deleted: number; days: number }>(`/notifications/read/older?days=${clearOlderDays}`, {
        method: "DELETE",
      });
      emitNotificationsUpdated();
      const label = `${result.days || Number(clearOlderDays)} day${Number(clearOlderDays) === 1 ? "" : "s"}`;
      pushToast("success", result.deleted ? `${result.deleted} read notifications older than ${label} cleared.` : `No read notifications older than ${label}.`);
      setSelected(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to clear old read notifications." : "Failed to clear old read notifications.";
      pushToast("error", message);
    } finally {
      setIsClearingOlderRead(false);
    }
  };

  const openDetails = (row: NotificationRow) => {
    setSelected(row);
    if (!row.is_read) {
      void markOneRead(row, { silent: true, keepOpen: true });
    }
  };

  return (
    <PageShell
      title="Notifications"
      subtitle="Review unread updates and mark them as handled."
    >
      <div className="dh-page">
        <Card className="card--compact-row notification-filter-row">
          <div className="table-actions">
            <button
              className={`btn btn--sm ${filter === "unread" ? "btn--primary" : "btn--secondary"} dh-btn`}
              type="button"
              onClick={() => setFilter("unread")}
            >
              Unread
            </button>
            <button
              className={`btn btn--sm ${filter === "all" ? "btn--primary" : "btn--secondary"} dh-btn`}
              type="button"
              onClick={() => setFilter("all")}
            >
              All
            </button>
          </div>
          <div className="table-actions" style={{ marginLeft: "auto" }}>
            <select
              className="field__control"
              value={clearOlderDays}
              onChange={(event) => setClearOlderDays(event.target.value as "7" | "30" | "90")}
              aria-label="Clear read notifications older than"
              style={{ width: 170, minWidth: 170 }}
            >
              <option value="7">Older than 7 days</option>
              <option value="30">Older than 30 days</option>
              <option value="90">Older than 90 days</option>
            </select>
            <button className="btn btn--secondary dh-btn" type="button" onClick={clearReadOlderThan} disabled={isClearingOlderRead}>
              {isClearingOlderRead ? "Clearing..." : "Clear Older Read"}
            </button>
            <button className="btn btn--secondary dh-btn" type="button" onClick={clearRead} disabled={isClearingRead}>
              {isClearingRead ? "Clearing..." : "Clear Read"}
            </button>
            <button className="btn btn--primary dh-btn" type="button" onClick={markAllRead} disabled={isMarkingAll || !rows.length}>
              {isMarkingAll ? "Updating..." : "Mark All Read"}
            </button>
          </div>
        </Card>
        <p className="info-text">
          {filter === "unread" ? `Unread notifications: ${pagination.total}` : `Unread on current page: ${unreadCount}`}
        </p>

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
            <Table<NotificationRow>
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage="No notifications found."
              columns={[
                {
                  key: "title",
                  label: "Title",
                  className: "table-cell-strong",
                  render: (row) => (
                    <button className="program-title-btn" type="button" onClick={() => openDetails(row)}>
                      {row.title}
                    </button>
                  ),
                },
                {
                  key: "preview",
                  label: "Body",
                  render: (row) => (
                    <button className="program-description-cell program-title-btn" type="button" onClick={() => openDetails(row)}>
                      {row.body || "No message body."}
                    </button>
                  ),
                },
                {
                  key: "status",
                  label: "State",
                  render: (row) => <Badge tone={row.is_read ? "default" : "new"}>{row.is_read ? "read" : "unread"}</Badge>,
                },
                {
                  key: "created",
                  label: "Created",
                  render: (row) => formatDateTime(row.created_at),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="table-actions dh-table-actions">
                      <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => markOneRead(row)} disabled={row.is_read}>
                        Mark Read
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
                  <button className="program-mobile-item__title program-title-btn" type="button" onClick={() => openDetails(row)}>
                    {row.title}
                  </button>
                  <button className="info-text program-title-btn" type="button" onClick={() => openDetails(row)}>
                    {row.body || "No message body."}
                  </button>
                  <p className="info-text info-text--small">{formatDateTime(row.created_at)}</p>
                  <div className="table-actions">
                    <Badge tone={row.is_read ? "default" : "new"}>{row.is_read ? "read" : "unread"}</Badge>
                    <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => markOneRead(row)} disabled={row.is_read}>
                      Mark Read
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <Card>
                <div className="empty-state">
                  <p className="empty-state__title">No notifications</p>
                  <p className="empty-state__description">Everything is up to date.</p>
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
              <h3 className="modal-title">Notification Details</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line"><strong>Title:</strong> {selected.title}</p>
              <p className="post-details__line"><strong>Body:</strong> {selected.body || "No message body."}</p>
              <p className="post-details__line"><strong>Status:</strong> {selected.is_read ? "Read" : "Unread"}</p>
              <p className="post-details__line"><strong>Created:</strong> {formatDateTime(selected.created_at)}</p>
              <p className="post-details__line"><strong>Read At:</strong> {selected.read_at ? formatDateTime(selected.read_at) : "Not yet"}</p>
            </div>
            <div className="modal-actions">
              {!selected.is_read ? (
                <button className="btn btn--secondary" type="button" onClick={() => void markOneRead(selected, { keepOpen: true })}>
                  Mark Read
                </button>
              ) : null}
              <button className="btn btn--primary" type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PageShell>
  );
}
