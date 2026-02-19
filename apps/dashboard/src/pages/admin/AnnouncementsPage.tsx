import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { announcementsMock } from "../../mock/adminUiData";
import { formatDate, includesQuery } from "../../utils/format";

export function AnnouncementsPage() {
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("all");

  const rows = useMemo(
    () =>
      announcementsMock.filter((item) => {
        if (audience !== "all" && item.audience !== audience) {
          return false;
        }

        return includesQuery(`${item.title} ${item.audience}`, search);
      }),
    [search, audience],
  );

  return (
    <PageShell title="Announcements" subtitle="Plan and publish audience-targeted announcements.">
      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search announcement title"
        selects={[
          {
            label: "Audience",
            value: audience,
            options: [
              { label: "All Audiences", value: "all" },
              { label: "Students", value: "students" },
              { label: "Instructors", value: "instructors" },
            ],
            onChange: setAudience,
          },
        ]}
        actionLabel="Apply"
        onAction={() => undefined}
      />

      {rows.length ? (
        <div className="cards-grid">
          {rows.map((item) => (
            <Card key={item.id} className="announcement-card">
              <div className="announcement-card__head">
                <h3 className="section-title">{item.title}</h3>
                <Badge tone="default">{item.audience}</Badge>
              </div>
              <div className="announcement-card__meta">
                <Badge tone={item.status === "published" ? "published" : "draft"}>{item.status}</Badge>
                <span className="info-text">Publish date: {formatDate(item.publishDate)}</span>
              </div>
              <div className="table-actions">
                <button className="btn btn--secondary btn--sm" type="button" disabled title="API wiring next step">
                  Edit
                </button>
                <button className="btn btn--primary btn--sm" type="button" disabled title="API wiring next step">
                  Publish
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="empty-state">
            <p className="empty-state__title">No announcements</p>
            <p className="empty-state__description">No announcements match the selected audience filter.</p>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
