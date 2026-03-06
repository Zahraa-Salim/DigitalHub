import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { ApiError, api, apiList, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
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

  const markOneRead = async (row: NotificationRow) => {
    if (row.is_read) {
      return;
    }

    try {
      await api<NotificationRow>(`/notifications/${row.id}/read`, {
        method: "PATCH",
      });
      pushToast("success", "Notification marked as read.");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to mark notification as read." : "Failed to mark notification as read.";
      pushToast("error", message);
    }
  };

  const markAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await api<{ updated: number }>("/notifications/read-all", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      pushToast("success", "All notifications marked as read.");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to mark all as read." : "Failed to mark all as read.";
      pushToast("error", message);
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <PageShell
      title="Notifications"
      subtitle="Review unread updates and mark them as handled."
      actions={
        <button className="btn btn--primary dh-btn" type="button" onClick={markAllRead} disabled={isMarkingAll || !rows.length}>
          {isMarkingAll ? "Updating..." : "Mark All Read"}
        </button>
      }
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
          <p className="info-text">
            {filter === "unread" ? `Unread notifications: ${pagination.total}` : `Unread on current page: ${unreadCount}`}
          </p>
        </Card>

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
                  render: (row) => row.title,
                },
                {
                  key: "preview",
                  label: "Body",
                  render: (row) => <p className="program-description-cell">{row.body || "No message body."}</p>,
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
                  <h3 className="program-mobile-item__title">{row.title}</h3>
                  <p className="info-text">{row.body || "No message body."}</p>
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

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PageShell>
  );
}
