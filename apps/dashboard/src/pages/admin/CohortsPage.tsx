import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { StatsCard } from "../../components/StatsCard";
import { Table } from "../../components/Table";
import { cohortsMock } from "../../mock/adminUiData";
import { formatDate, includesQuery } from "../../utils/format";

type CohortRow = (typeof cohortsMock)[number];

export function CohortsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [program, setProgram] = useState("all");

  const programOptions = useMemo(() => ["all", ...new Set(cohortsMock.map((item) => item.program))], []);

  const rows = useMemo(
    () =>
      cohortsMock.filter((item) => {
        if (status !== "all" && item.status !== status) {
          return false;
        }

        if (program !== "all" && item.program !== program) {
          return false;
        }

        return includesQuery(`${item.name} ${item.program}`, search);
      }),
    [search, status, program],
  );

  return (
    <PageShell title="Cohorts" subtitle="Monitor cohort lifecycle, enrollment windows, and seat capacity.">
      <div className="stats-grid stats-grid--compact">
        <StatsCard label="Open Cohorts" value={String(cohortsMock.filter((item) => item.status === "open").length)} hint="Applications enabled" />
        <StatsCard label="Running" value={String(cohortsMock.filter((item) => item.status === "running").length)} hint="Currently active" />
        <StatsCard label="Completed" value={String(cohortsMock.filter((item) => item.status === "completed").length)} hint="Archived for reports" />
      </div>

      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by cohort or program"
        selects={[
          {
            label: "Status",
            value: status,
            options: [
              { label: "All", value: "all" },
              { label: "Planned", value: "planned" },
              { label: "Open", value: "open" },
              { label: "Running", value: "running" },
              { label: "Completed", value: "completed" },
              { label: "Cancelled", value: "cancelled" },
            ],
            onChange: setStatus,
          },
          {
            label: "Program",
            value: program,
            options: programOptions.map((item) => ({ label: item === "all" ? "All programs" : item, value: item })),
            onChange: setProgram,
          },
        ]}
        actionLabel="Apply"
        onAction={() => undefined}
      />

      <Card className="card--table">
        <Table<CohortRow>
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No cohorts match the current filters."
          columns={[
            { key: "name", label: "Cohort", className: "table-cell-strong", render: (row) => row.name },
            { key: "program", label: "Program", render: (row) => row.program },
            { key: "status", label: "Status", render: (row) => <Badge tone={row.status}>{row.status}</Badge> },
            { key: "capacity", label: "Capacity", render: (row) => row.capacity },
            { key: "start", label: "Start Date", render: (row) => formatDate(row.startDate) },
            {
              key: "actions",
              label: "Actions",
              render: () => (
                <div className="table-actions">
                  <button className="btn btn--secondary btn--sm" type="button" disabled title="API wiring next step">
                    Edit
                  </button>
                  <button className="btn btn--primary btn--sm" type="button" disabled title="API wiring next step">
                    Open Enrollment
                  </button>
                  <button className="btn btn--danger btn--sm" type="button" disabled title="API wiring next step">
                    Close Enrollment
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
