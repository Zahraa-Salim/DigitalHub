import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { eventsMock } from "../../mock/adminUiData";
import { formatDate, includesQuery } from "../../utils/format";
import "../../styles/global.css";

export function EventsPage() {
  const [search, setSearch] = useState("");
  const [published, setPublished] = useState("all");
  const [isDone, setIsDone] = useState("all");
const [showForm, setShowForm] = useState(false);
const [form, setForm] = useState({
  slug: "",
  title: "",
  description: "",
  location: "",
  starts_at: "",
  ends_at: "",
  is_published: false,
  is_done: false,    
  done_at: "",       
});
const [isClosing, setIsClosing] = useState(false);
const handleClose = () => {
  setIsClosing(true);
  setTimeout(() => {
    setShowForm(false);
    setIsClosing(false);
  }, 300); // نفس مدة animation
};
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
        actionLabel="Appy"
        // onAction={() => undefined}
        onAction={() => setShowForm(true)}
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
{/* ----------------------------------------- */}
{/* insert */}

{/* ---------------------------------------------- */}
{showForm && (
  <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
    <div className={`modal-content ${isClosing ? "fade-out" : ""}`}>
      <h2 style={{ marginBottom: "10px" }}>Create Event</h2>
      <form
      onSubmit={async (e) => {
    e.preventDefault();

    try {
   
 const res =  await fetch("http://localhost:5000/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
  body: JSON.stringify(form),
});
// const res = await fetch("http://localhost:5000/eventss", {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json",
//   },
//   body: JSON.stringify(form),
// });

const text = await res.text();
console.log("STATUS:", res.status);
console.log("RESPONSE:", text);

if (res.ok) {
  alert("Event created!");
  handleClose();
} else {
  alert("Error creating event");
}
    } catch (err) {
      console.error(err);
      alert("Network error or server issue");
    }
  }}
        className="form-grid"
      >
        {/* Title */}
        <label className="full-width">
          Title
          <input
            name="title"
            // placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>

        {/* Slug */}
        <label className="full-width">
          Slug
          <input
            name="slug"
            // placeholder="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />
        </label>

        {/* Description */}
        <label className="full-width">
          Description
          <textarea
            name="description"
            // placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        {/* Location */}
        <label>
          Location
          <input
            name="location"
            // placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </label>

        {/* Start Date */}
        <label>
          Start Date
          <input
            type="datetime-local"
            name="starts_at"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            required
          />
        </label>

        {/* End Date */}
        <label>
          End Date
          <input
            type="datetime-local"
            name="ends_at"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
          />
        </label>

{/* Is Published */}
<label className="checkbox-container">
  Published
  <input
    type="checkbox"
    name="is_published"
    checked={form.is_published}
    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
  />
  <span className="checkmark"></span>
</label>

{/* Is Done */}
<label className="checkbox-container">
  Done
  <input
    type="checkbox"
    name="is_done"
    checked={form.is_done}
    onChange={(e) => setForm({ ...form, is_done: e.target.checked })}
  />
  <span className="checkmark"></span>
</label>

        {/* Done At */}
        {form.is_done && (
          <label className="full-width">
            Done At
            <input
              type="datetime-local"
              name="done_at"
              value={form.done_at}
              onChange={(e) => setForm({ ...form, done_at: e.target.value })}
            />
          </label>
        )}

        {/* Buttons */}
        <div className="full-width button-group">
          <button type="submit" className="btn--black">
            Create
          </button>
          <button type="button" className="btn--ghost" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </PageShell>
  );
}
