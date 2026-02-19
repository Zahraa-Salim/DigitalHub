import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Table } from "../../components/Table";
import { managersMock } from "../../mock/adminUiData";
import { includesQuery } from "../../utils/format";

type ManagerRow = (typeof managersMock)[number];

export function ProfilesManagersPage() {
  const [search, setSearch] = useState("");
  const [isPublic, setIsPublic] = useState("all");

  const rows = useMemo(
    () =>
      managersMock.filter((item) => {
        if (isPublic === "public" && !item.isPublic) {
          return false;
        }

        if (isPublic === "private" && item.isPublic) {
          return false;
        }

        return includesQuery(`${item.name} ${item.jobTitle}`, search);
      }),
    [search, isPublic],
  );

  return (
    <PageShell title="Managers" subtitle="Manage manager/team profiles displayed on the public team page.">
      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search manager name or title"
        selects={[
          {
            label: "Visibility",
            value: isPublic,
            options: [
              { label: "All", value: "all" },
              { label: "Public", value: "public" },
              { label: "Private", value: "private" },
            ],
            onChange: setIsPublic,
          },
        ]}
        actionLabel="Apply"
        onAction={() => undefined}
      />

      <Card className="card--table">
        <Table<ManagerRow>
          rows={rows}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", label: "Name", className: "table-cell-strong", render: (row) => row.name },
            { key: "title", label: "Job Title", render: (row) => row.jobTitle },
            { key: "sort", label: "Sort Order", render: (row) => row.sortOrder },
            { key: "public", label: "Visibility", render: (row) => <Badge tone={row.isPublic ? "public" : "private"}>{row.isPublic ? "public" : "private"}</Badge> },
            {
              key: "actions",
              label: "Actions",
              render: () => (
                <div className="table-actions">
                  <button className="btn btn--secondary btn--sm" type="button" disabled title="API wiring next step">
                    Edit
                  </button>
                  <button className="btn btn--primary btn--sm" type="button" disabled title="API wiring next step">
                    Toggle Public
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
