import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { eventsMock } from "../../mock/adminUiData";
import { formatDate, includesQuery } from "../../utils/format";

export function EventsPage() {
  const [search, setSearch] = useState("");
  const [published, setPublished] = useState("all");
  const [isDone, setIsDone] = useState("all");

  const rows = useMemo(
    () =>
      eventsMock.filter((item) => {
        if (published === "published" && !item.isPublished) {
          return false;
        }

        if (published === "unpublished" && item.isPublished) {
          return false;
        }

        if (isDone === "done" && !item.isDone) {
          return false;
        }

        if (isDone === "upcoming" && item.isDone) {
          return false;
        }

        return includesQuery(`${item.title} ${item.location}`, search);
      }),
    [search, published, isDone],
  );

  return (
    <PageShell title="Events" subtitle="Organize upcoming and completed events for public display.">
      <FilterBar
        className="filters-grid--4"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search event title or location"
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
          {
            label: "State",
            value: isDone,
            options: [
              { label: "All", value: "all" },
              { label: "Done", value: "done" },
              { label: "Upcoming", value: "upcoming" },
            ],
            onChange: setIsDone,
          },
        ]}
        actionLabel="Apply"
        onAction={() => undefined}
      />

      {rows.length ? (
        <div className="cards-grid">
          {rows.map((item) => (
            <Card key={item.id} className="event-card">
              <h3 className="section-title">{item.title}</h3>
              <p className="info-text">Date: {formatDate(item.date)}</p>
              <p className="info-text">Location: {item.location}</p>
              <div className="event-card__badges">
                <Badge tone={item.isPublished ? "published" : "unpublished"}>
                  {item.isPublished ? "published" : "unpublished"}
                </Badge>
                <Badge tone={item.isDone ? "done" : "pending"}>{item.isDone ? "done" : "upcoming"}</Badge>
              </div>
              <button className="btn btn--secondary btn--sm" type="button" disabled title="API wiring next step">
                Edit Event
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="empty-state">
            <p className="empty-state__title">No events found</p>
            <p className="empty-state__description">No events match the selected filters.</p>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
