import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Table } from "../../components/Table";
import { contactMessagesMock } from "../../mock/adminUiData";
import { formatDateTime, includesQuery } from "../../utils/format";

type ContactRow = (typeof contactMessagesMock)[number];

export function ContactInboxPage() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      contactMessagesMock.filter((item) => {
        if (kind !== "all" && item.kind !== kind) {
          return false;
        }

        if (status !== "all" && item.status !== status) {
          return false;
        }

        return includesQuery(`${item.name} ${item.email} ${item.kind}`, search);
      }),
    [search, kind, status],
  );

  return (
    <PageShell title="Contact Inbox" subtitle="Track incoming questions, feedback, and company visit requests.">
      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by sender, email, or kind"
        selects={[
          {
            label: "Kind",
            value: kind,
            options: [
              { label: "All", value: "all" },
              { label: "Question", value: "question" },
              { label: "Feedback", value: "feedback" },
              { label: "Visit Request", value: "visit_request" },
            ],
            onChange: setKind,
          },
          {
            label: "Status",
            value: status,
            options: [
              { label: "All", value: "all" },
              { label: "New", value: "new" },
              { label: "In Progress", value: "in_progress" },
              { label: "Resolved", value: "resolved" },
            ],
            onChange: setStatus,
          },
        ]}
        actionLabel="Apply"
        onAction={() => undefined}
      />

      <Card className="card--table">
        <Table<ContactRow>
          rows={rows}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", label: "Name", className: "table-cell-strong", render: (row) => row.name },
            { key: "email", label: "Email", render: (row) => row.email },
            { key: "kind", label: "Kind", render: (row) => <Badge tone="default">{row.kind}</Badge> },
            { key: "status", label: "Status", render: (row) => <Badge tone={row.status}>{row.status}</Badge> },
            { key: "created", label: "Received", render: (row) => formatDateTime(row.createdAt) },
            {
              key: "actions",
              label: "Actions",
              render: () => (
                <div className="table-actions">
                  <button className="btn btn--secondary btn--sm" type="button" disabled title="API wiring next step">
                    Open
                  </button>
                  <button className="btn btn--primary btn--sm" type="button" disabled title="API wiring next step">
                    Mark Resolved
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </PageShell>
  );
}
