import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Table } from "../../components/Table";
import { studentsMock } from "../../mock/adminUiData";
import { includesQuery } from "../../utils/format";

type StudentRow = (typeof studentsMock)[number];

export function ProfilesStudentsPage() {
  const [search, setSearch] = useState("");
  const [isPublic, setIsPublic] = useState("all");
  const [featured, setFeatured] = useState("all");

  const rows = useMemo(
    () =>
      studentsMock.filter((item) => {
        if (isPublic === "public" && !item.isPublic) {
          return false;
        }

        if (isPublic === "private" && item.isPublic) {
          return false;
        }

        if (featured === "featured" && !item.featured) {
          return false;
        }

        if (featured === "regular" && item.featured) {
          return false;
        }

        return includesQuery(`${item.name} ${item.track}`, search);
      }),
    [search, isPublic, featured],
  );

  return (
    <PageShell title="Students" subtitle="Manage public visibility and featured placement of student profiles.">
      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search student name or track"
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
          {
            label: "Featured",
            value: featured,
            options: [
              { label: "All", value: "all" },
              { label: "Featured", value: "featured" },
              { label: "Regular", value: "regular" },
            ],
            onChange: setFeatured,
          },
        ]}
        actionLabel="Apply"
        onAction={() => undefined}
      />

      <Card className="card--table">
        <Table<StudentRow>
          rows={rows}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", label: "Name", className: "table-cell-strong", render: (row) => row.name },
            { key: "track", label: "Track", render: (row) => row.track },
            { key: "featured", label: "Featured", render: (row) => <Badge tone={row.featured ? "approved" : "default"}>{row.featured ? "featured" : "regular"}</Badge> },
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
