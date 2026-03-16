// File: frontend/src/dashboard/pages/admin/MessagesPage.tsx
// Purpose: Renders the admin messages page page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { Table } from "../../components/Table";
import { ToastStack } from "../../components/ToastStack";
import { useDashboardToasts } from "../../hooks/useDashboardToasts";
import {
  deleteOverviewMessage,
  listOverviewMessages,
  resendOverviewMessage,
  type OverviewMessageRow,
} from "../../lib/api";
import { ApiError, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { useSearchParams } from "react-router-dom";

type MessageStatus = "draft" | "sent" | "failed";
type MessageChannel = "all" | "email" | "whatsapp";

const defaultPagination: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

function toStatus(value: string | null): MessageStatus {
  if (value === "draft") return "draft";
  return value === "failed" ? "failed" : "sent";
}

function toChannel(value: string | null): MessageChannel {
  if (value === "email" || value === "whatsapp" || value === "all") {
    return value;
  }
  return "all";
}

export function MessagesPage() {
  const { toasts, pushToast, dismissToast } = useDashboardToasts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState<MessageStatus>(toStatus(searchParams.get("status")));
  const [channel, setChannel] = useState<MessageChannel>(toChannel(searchParams.get("channel")));
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [rows, setRows] = useState<OverviewMessageRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<OverviewMessageRow | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    setPage(1);
  }, [status, channel, search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status !== "sent") params.set("status", status);
    if (channel !== "all") params.set("channel", channel);
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [channel, page, search, setSearchParams, status]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      setActionError("");
      try {
        const result = await listOverviewMessages({
          page,
          limit: 20,
          status,
          channel,
          search: search.trim() || undefined,
        });

        if (!active) return;

        setRows(result.data);
        setPagination(result.pagination);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message || "Failed to load messages." : "Failed to load messages.";
        setError(message);
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
  }, [channel, page, refreshTick, search, status]);

  const refresh = () => setRefreshTick((value) => value + 1);

  const handleSendDraftOrRetry = async (row: OverviewMessageRow) => {
    if (row.status !== "failed" && row.status !== "draft") return;
    setResendingId(row.id);
    setActionError("");
    setActionSuccess("");
    try {
      await resendOverviewMessage(row.id);
      setActionSuccess(row.status === "draft" ? `Draft #${row.id} sent.` : `Message #${row.id} resend completed.`);
      refresh();
    } catch (err) {
      const fallback = row.status === "draft" ? "Failed to send draft." : "Failed to resend message.";
      const message = err instanceof ApiError ? err.message || fallback : fallback;
      setActionError(message);
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async (row: OverviewMessageRow) => {
    const shouldDelete = window.confirm(`Delete message #${row.id}? This cannot be undone.`);
    if (!shouldDelete) return;

    setDeletingId(row.id);
    setActionError("");
    setActionSuccess("");
    try {
      await deleteOverviewMessage(row.id);
      if (selected?.id === row.id) {
        setSelected(null);
      }
      setActionSuccess(`Message #${row.id} deleted.`);
      refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to delete message." : "Failed to delete message.";
      setActionError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPagesSafe = Math.max(pagination.totalPages, 1);
  const statusLabel = status === "draft" ? "draft" : status === "sent" ? "sent" : "failed";
  const channelLabel = channel === "all" ? "all channels" : channel;

  const emptyMessage = useMemo(
    () => `No ${statusLabel} messages found for ${channelLabel}.`,
    [channelLabel, statusLabel],
  );

  useEffect(() => {
    if (error) {
      pushToast("error", error);
    }
  }, [error, pushToast]);

  useEffect(() => {
    if (actionError) {
      pushToast("error", actionError);
    }
  }, [actionError, pushToast]);

  useEffect(() => {
    if (actionSuccess) {
      pushToast("success", actionSuccess);
    }
  }, [actionSuccess, pushToast]);

  return (
    <PageShell title="Message Delivery Details" subtitle="Inspect draft, sent, and failed outbound messages.">
      <div className="dh-page">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar
              className="dh-form-grid dh-form-grid--notifications"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by recipient (email or phone)"
              selects={[
                {
                  label: "Status",
                  value: status,
                  options: [
                    { label: "Draft", value: "draft" },
                    { label: "Sent", value: "sent" },
                    { label: "Failed", value: "failed" },
                  ],
                  onChange: (value) => setStatus(toStatus(value)),
                },
                {
                  label: "Channel",
                  value: channel,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Email", value: "email" },
                    { label: "WhatsApp", value: "whatsapp" },
                  ],
                  onChange: (value) => setChannel(toChannel(value)),
                },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <Card className="card--table desktop-only dh-table-wrap">
            <div className="program-skeleton-table" aria-hidden>
              <div className="program-skeleton-line program-skeleton-line--lg" />
              <div className="program-skeleton-line" />
              <div className="program-skeleton-line program-skeleton-line--sm" />
            </div>
          </Card>
        ) : null}

        {!loading ? (
          <Card className="card--table desktop-only dh-table-wrap">
            <Table<OverviewMessageRow>
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage={emptyMessage}
              columns={[
                {
                  key: "created",
                  label: "Created",
                  render: (row) => formatDateTime(row.created_at),
                },
                {
                  key: "channel",
                  label: "Channel",
                  render: (row) => row.channel,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => row.status,
                },
                {
                  key: "to",
                  label: "Recipient",
                  render: (row) => row.to_value,
                },
                {
                  key: "subject",
                  label: "Subject",
                  render: (row) => row.subject || "-",
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="table-actions dh-table-actions">
                      <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => setSelected(row)}>
                        Details
                      </button>
                      {row.status === "failed" || row.status === "draft" ? (
                        <button
                          className="btn btn--secondary btn--sm dh-btn"
                          type="button"
                          onClick={() => void handleSendDraftOrRetry(row)}
                          disabled={resendingId === row.id}
                        >
                          {resendingId === row.id
                            ? row.status === "draft"
                              ? "Sending..."
                              : "Resending..."
                            : row.status === "draft"
                              ? "Send Draft"
                              : "Resend Failed"}
                        </button>
                      ) : null}
                      <button
                        className="btn btn--danger btn--sm dh-btn"
                        type="button"
                        onClick={() => void handleDelete(row)}
                        disabled={deletingId === row.id}
                      >
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
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
              <h3 className="modal-title">Message Details</h3>
              <button className="modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close modal" title="Close">
                X
              </button>
            </header>
            <div className="post-details">
              <p className="post-details__line"><strong>Status:</strong> {selected.status}</p>
              <p className="post-details__line"><strong>Channel:</strong> {selected.channel}</p>
              <p className="post-details__line"><strong>Recipient:</strong> {selected.to_value}</p>
              <p className="post-details__line"><strong>Subject:</strong> {selected.subject || "-"}</p>
              <p className="post-details__line"><strong>Template:</strong> {selected.template_key || "-"}</p>
              <p className="post-details__line"><strong>Sent At:</strong> {selected.sent_at ? formatDateTime(selected.sent_at) : "-"}</p>
              <p className="post-details__line"><strong>Created At:</strong> {formatDateTime(selected.created_at)}</p>
              {selected.last_error ? (
                <p className="post-details__line"><strong>Last Error:</strong> {selected.last_error}</p>
              ) : null}
              <pre className="metadata-block">{selected.body}</pre>
            </div>
            <div className="modal-actions">
              {selected.status === "failed" || selected.status === "draft" ? (
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() => void handleSendDraftOrRetry(selected)}
                  disabled={resendingId === selected.id}
                >
                  {resendingId === selected.id
                    ? selected.status === "draft"
                      ? "Sending..."
                      : "Resending..."
                    : selected.status === "draft"
                      ? "Send Draft"
                      : "Resend Failed"}
                </button>
              ) : null}
              <button
                className="btn btn--danger"
                type="button"
                onClick={() => void handleDelete(selected)}
                disabled={deletingId === selected.id}
              >
                {deletingId === selected.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

