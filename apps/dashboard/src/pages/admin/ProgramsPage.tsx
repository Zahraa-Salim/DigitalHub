import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { StatsCard } from "../../components/StatsCard";
import { Table } from "../../components/Table";
import { programsMock } from "../../mock/adminUiData";
import { formatDateTime, includesQuery } from "../../utils/format";

type ProgramRow = (typeof programsMock)[number];

export function ProgramsPage() {
  const [search, setSearch] = useState("");
  const [published, setPublished] = useState("all");

  const rows = useMemo(
    () =>
      programsMock.filter((item) => {
        if (published === "published" && !item.isPublished) {
          return false;
        }

        if (published === "unpublished" && item.isPublished) {
          return false;
        }

        return includesQuery(item.title, search);
      }),
    [search, published],
  );

  return (
    <PageShell title="Programs" subtitle="Manage published and draft programs for upcoming cohorts.">
      <div className="stats-grid stats-grid--compact">
        <StatsCard label="Published" value={String(programsMock.filter((item) => item.isPublished).length)} hint="Visible on website" />
        <StatsCard label="Unpublished" value={String(programsMock.filter((item) => !item.isPublished).length)} hint="Internal drafts" />
      </div>

      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search program title"
        selects={[
          {
            label: "Published",
            value: published,
            options: [
              { label: "All", value: "all" },
              { label: "Published", value: "published" },
              { label: "Unpublished", value: "unpublished" },
            ],
            onChange: setPublished,
          },
        ]}
        actionLabel="Apply"
        onAction={() => undefined}
      />

      <Card className="card--table">
        <Table<ProgramRow>
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="No programs found for current filter values."
          columns={[
            { key: "title", label: "Title", className: "table-cell-strong", render: (row) => row.title },
            { key: "updated", label: "Updated", render: (row) => formatDateTime(row.updatedAt) },
            {
              key: "published",
              label: "Published",
              render: (row) => (
                <Badge tone={row.isPublished ? "published" : "unpublished"}>
                  {row.isPublished ? "published" : "unpublished"}
                </Badge>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: () => (
                <div className="table-actions">
                  <button className="btn btn--secondary btn--sm" type="button" disabled title="API wiring next step">
                    Edit
                  </button>
                  <button className="btn btn--danger btn--sm" type="button" disabled title="API wiring next step">
                    Delete
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
