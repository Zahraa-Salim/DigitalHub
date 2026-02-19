import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { StatsCard } from "../../components/StatsCard";
import { Table } from "../../components/Table";
import { applicationsMock } from "../../mock/adminUiData";
import { formatDateTime, includesQuery } from "../../utils/format";

type ApplicationRow = (typeof applicationsMock)[number];

export function ApplicationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [cohort, setCohort] = useState("all");

  const cohortOptions = useMemo(
    () => ["all", ...new Set(applicationsMock.map((item) => item.cohort))],
    [],
  );

  const rows = useMemo(
    () =>
      applicationsMock.filter((item) => {
        if (status !== "all" && item.status !== status) {
          return false;
        }

        if (cohort !== "all" && item.cohort !== cohort) {
          return false;
        }

        return includesQuery(`${item.name} ${item.email} ${item.cohort}`, search);
      }),
    [search, status, cohort],
  );

  return (
    <PageShell title="Applications" subtitle="Review applicant submissions before approval and enrollment.">
      <div className="stats-grid stats-grid--compact">
        <StatsCard
          label="Pending"
          value={String(applicationsMock.filter((item) => item.status === "pending").length)}
          hint="Awaiting decision"
        />
        <StatsCard
          label="Approved"
          value={String(applicationsMock.filter((item) => item.status === "approved").length)}
          hint="Ready for onboarding"
        />
        <StatsCard
          label="Rejected"
          value={String(applicationsMock.filter((item) => item.status === "rejected").length)}
          hint="Closed applications"
        />
      </div>

      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by applicant, email, or cohort"
        selects={[
          {
            label: "Status",
            value: status,
            options: [
              { label: "All", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "Approved", value: "approved" },
              { label: "Rejected", value: "rejected" },
            ],
            onChange: setStatus,
          },
          {
            label: "Cohort",
            value: cohort,
            options: cohortOptions.map((item) => ({ label: item === "all" ? "All cohorts" : item, value: item })),
            onChange: setCohort,
          },
        ]}
        actionLabel="Apply"
        onAction={() => undefined}
      />

      <Card className="card--table">
        <Table<ApplicationRow>
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No applications match your selected filters."
          columns={[
            { key: "name", label: "Applicant", className: "table-cell-strong", render: (row) => row.name },
            { key: "email", label: "Email", render: (row) => row.email },
            { key: "cohort", label: "Cohort", render: (row) => row.cohort },
            {
              key: "status",
              label: "Status",
              render: (row) => <Badge tone={row.status}>{row.status}</Badge>,
            },
            {
              key: "submitted_at",
              label: "Submitted",
              render: (row) => formatDateTime(row.submittedAt),
            },
            {
              key: "actions",
              label: "Actions",
              render: () => (
                <div className="table-actions">
                  <button className="btn btn--secondary btn--sm" type="button" disabled title="API wiring next step">
                    View
                  </button>
                  <button className="btn btn--primary btn--sm" type="button" disabled title="API wiring next step">
                    Approve
                  </button>
                  <button className="btn btn--danger btn--sm" type="button" disabled title="API wiring next step">
                    Reject
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
