import { useMemo, useState } from "react";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Table } from "../../components/Table";
import { logsMock } from "../../mock/adminUiData";
import { formatDateTime } from "../../utils/format";

type LogRow = (typeof logsMock)[number];

export function ActivityLogsPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<LogRow | null>(null);

  const rows = useMemo(
    () =>
      logsMock.filter((item) => {
        if (action !== "all" && item.action !== action) {
          return false;
        }

        if (entityType !== "all" && item.entityType !== entityType) {
          return false;
        }

        if (dateFrom && item.time < `${dateFrom}T00:00:00Z`) {
          return false;
        }

        if (dateTo && item.time > `${dateTo}T23:59:59Z`) {
          return false;
        }

        if (!search.trim()) {
          return true;
        }

        return `${item.action} ${item.entityType} ${item.message}`
          .toLowerCase()
          .includes(search.trim().toLowerCase());
      }),
    [search, action, entityType, dateFrom, dateTo],
  );

  return (
    <PageShell title="Activity Logs" subtitle="Audit actions by entity and date range for admin traceability.">
      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search action, entity, or message"
        selects={[
          {
            label: "Action",
            value: action,
            options: [
              { label: "All", value: "all" },
              { label: "Approve Application", value: "approve_application" },
              { label: "Edit Theme", value: "edit_theme" },
              { label: "Create Event", value: "create_event" },
            ],
            onChange: setAction,
          },
          {
            label: "Entity",
            value: entityType,
            options: [
              { label: "All", value: "all" },
              { label: "Applications", value: "applications" },
              { label: "Theme Tokens", value: "theme_tokens" },
              { label: "Events", value: "events" },
            ],
            onChange: setEntityType,
          },
        ]}
        extra={
          <>
            <label className="field">
              <span className="field__label">Date From</span>
              <input className="field__control" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Date To</span>
              <input className="field__control" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </>
        }
        actionLabel="Apply"
        onAction={() => undefined}
      />

      <Card className="card--table">
        <Table<LogRow>
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No logs matched the selected filters."
          columns={[
            { key: "time", label: "Time", render: (row) => formatDateTime(row.time) },
            { key: "action", label: "Action", className: "table-cell-strong", render: (row) => row.action },
            { key: "entity", label: "Entity", render: (row) => row.entityType },
            { key: "message", label: "Message", render: (row) => row.message },
            {
              key: "details",
              label: "Details",
              render: (row) => (
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => setSelected(row)}>
                  View Details
                </button>
              ),
            },
          ]}
        />
      </Card>

      {selected ? (
        <div className="modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Log Details</h3>
              <button className="modal-close" type="button" onClick={() => setSelected(null)}>
                Close
              </button>
            </header>
            <div className="post-details">
              <p className="post-details__line">
                <strong>Action:</strong> {selected.action}
              </p>
              <p className="post-details__line">
                <strong>Entity:</strong> {selected.entityType}
              </p>
              <p className="post-details__line">
                <strong>Message:</strong> {selected.message}
              </p>
              <p className="post-details__line">
                <strong>Time:</strong> {formatDateTime(selected.time)}
              </p>
              <pre className="metadata-block">{JSON.stringify(selected.metadata, null, 2)}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
