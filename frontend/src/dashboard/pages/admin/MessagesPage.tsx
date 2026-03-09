// File: frontend/src/dashboard/pages/admin/MessagesPage.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { Table } from "../../components/Table";
import { listOverviewMessages, type OverviewMessageRow } from "../../lib/api";
import { ApiError, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { useSearchParams } from "react-router-dom";

type MessageStatus = "sent" | "failed";
type MessageChannel = "all" | "email" | "whatsapp";

const defaultPagination: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

function toStatus(value: string | null): MessageStatus {
  return value === "failed" ? "failed" : "sent";
}

function toChannel(value: string | null): MessageChannel {
  if (value === "email" || value === "whatsapp" || value === "all") {
    return value;
  }
  return "all";
}

export function MessagesPage() {
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
  }, [channel, page, search, status]);

  const totalPagesSafe = Math.max(pagination.totalPages, 1);
  const statusLabel = status === "sent" ? "sent" : "failed";
  const channelLabel = channel === "all" ? "all channels" : channel;

  const emptyMessage = useMemo(
    () => `No ${statusLabel} messages found for ${channelLabel}.`,
    [channelLabel, statusLabel],
  );

  return (
    <PageShell title="Message Delivery Details" subtitle="Inspect sent and failed outbound messages.">
      <div className="dh-page">
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

        {error ? (
          <Card>
            <p className="alert alert--error dh-alert">{error}</p>
          </Card>
        ) : null}

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
              <button className="modal-close" type="button" onClick={() => setSelected(null)}>X</button>
              <h3 className="modal-title">Message Details</h3>
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
              <button className="btn btn--primary" type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
