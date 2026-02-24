import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { StatsCard } from "../../components/StatsCard";
import { Table } from "../../components/Table";
import { ApiError, api, apiList } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";

type ProgramRow = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  requirements: string | null;
  default_capacity: number | null;
  is_published: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

type ProgramFormState = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  requirements: string;
  defaultCapacity: string;
};

type FormMode = "create" | "edit" | null;

const initialForm: ProgramFormState = {
  slug: "",
  title: "",
  summary: "",
  description: "",
  requirements: "",
  defaultCapacity: "",
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toFormState(program: ProgramRow | null): ProgramFormState {
  if (!program) {
    return initialForm;
  }

  return {
    slug: program.slug,
    title: program.title,
    summary: program.summary ?? "",
    description: program.description ?? "",
    requirements: program.requirements ?? "",
    defaultCapacity: program.default_capacity === null ? "" : String(program.default_capacity),
  };
}

export function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"updated_at" | "created_at" | "title">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [filterSheetOffset, setFilterSheetOffset] = useState(0);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<ProgramRow | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<ProgramRow | null>(null);
  const [form, setForm] = useState<ProgramFormState>(initialForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProgramRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const filterDragStartYRef = useRef<number | null>(null);
  const filterOffsetRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    let active = true;

    const loadPrograms = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await apiList<ProgramRow>(
          `/programs${buildQueryString({
            search: debouncedSearch || undefined,
            limit: 100,
            sortBy,
            order: sortOrder,
          })}`,
        );

        if (!active) {
          return;
        }

        setPrograms(result.data);
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message || "Failed to load programs.");
        } else {
          setError("Failed to load programs.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPrograms();

    return () => {
      active = false;
    };
  }, [debouncedSearch, refreshKey, sortBy, sortOrder]);

  const totalPrograms = programs.length;
  const lastUpdated = programs[0]?.updated_at ?? "";
  const formTitle = formMode === "create" ? "Add Program" : "Edit Program";

  const rows = useMemo(() => programs, [programs]);

  const openCreate = () => {
    setFormMode("create");
    setEditing(null);
    setForm(initialForm);
    setFormError("");
    setSuccess("");
  };

  const openEdit = (program: ProgramRow) => {
    setFormMode("edit");
    setEditing(program);
    setForm(toFormState(program));
    setFormError("");
    setSuccess("");
  };

  const closeForm = () => {
    if (isSubmitting) {
      return;
    }

    setFormMode(null);
    setEditing(null);
    setFormError("");
  };

  const parseCapacity = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error("Default capacity must be a whole number greater than or equal to 0.");
    }

    return parsed;
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const rawSlug = form.slug.trim() || title;
    const slug = slugify(rawSlug);

    if (!title) {
      setFormError("Program title is required.");
      return;
    }

    if (!slug) {
      setFormError("Program slug is required.");
      return;
    }

    let defaultCapacity: number | undefined;
    try {
      defaultCapacity = parseCapacity(form.defaultCapacity);
    } catch (capacityError) {
      setFormError(
        capacityError instanceof Error
          ? capacityError.message
          : "Default capacity must be a whole number greater than or equal to 0.",
      );
      return;
    }

    const payload: Record<string, unknown> = {
      slug,
      title,
      summary: form.summary.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim(),
    };

    if (defaultCapacity !== undefined) {
      payload.default_capacity = defaultCapacity;
    }

    setIsSubmitting(true);
    setFormError("");
    setError("");

    try {
      if (formMode === "create") {
        await api<ProgramRow>("/programs", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            is_published: true,
          }),
        });
        setSuccess("Program added successfully.");
      } else if (formMode === "edit" && editing) {
        await api<ProgramRow>(`/programs/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccess("Program updated successfully.");
      }

      setFormMode(null);
      setEditing(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || "Failed to save program.");
      } else {
        setFormError("Failed to save program.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await api<{ id: number }>(`/programs/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setSuccess("Program deleted successfully.");
      setDeleteTarget(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to delete program.");
      } else {
        setError("Failed to delete program.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const openMobileFilters = () => {
    setShowFiltersMobile(true);
    setFilterSheetOffset(0);
    filterOffsetRef.current = 0;
  };

  const closeMobileFilters = () => {
    setShowFiltersMobile(false);
    setIsFilterDragging(false);
    setFilterSheetOffset(0);
    filterOffsetRef.current = 0;
    filterDragStartYRef.current = null;
  };

  const handleFilterDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    filterDragStartYRef.current = event.clientY;
    setIsFilterDragging(true);
  };

  useEffect(() => {
    if (!isFilterDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (filterDragStartYRef.current === null) {
        return;
      }

      const delta = Math.max(0, event.clientY - filterDragStartYRef.current);
      filterOffsetRef.current = delta;
      setFilterSheetOffset(delta);
    };

    const handlePointerUp = () => {
      const shouldClose = filterOffsetRef.current > 130;
      setIsFilterDragging(false);
      filterDragStartYRef.current = null;

      if (shouldClose) {
        closeMobileFilters();
        return;
      }

      filterOffsetRef.current = 0;
      setFilterSheetOffset(0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isFilterDragging]);

  useEffect(() => {
    if (!showFiltersMobile) {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = () => {
      if (mediaQuery.matches) {
        setShowFiltersMobile(false);
        setIsFilterDragging(false);
        setFilterSheetOffset(0);
        filterOffsetRef.current = 0;
        filterDragStartYRef.current = null;
      }
    };

    closeOnDesktop();
    mediaQuery.addEventListener("change", closeOnDesktop);

    return () => {
      mediaQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [showFiltersMobile]);

  return (
    <PageShell
      title="Programs"
      subtitle="Manage program templates used by cohorts."
      actions={
        <button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={openCreate}>
          Add Program
        </button>
      }
    >
      <div className="dh-page">
        <div className="stats-grid stats-grid--compact dh-stats">
          <StatsCard label="Total Programs" value={String(totalPrograms)} hint="Templates in database" />
          <StatsCard
            label="Last Updated"
            value={lastUpdated ? formatDateTime(lastUpdated) : "No records"}
            hint="Most recently changed"
          />
        </div>

        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar
              className="dh-form-grid"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search program title"
              selects={[
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Last Updated", value: "updated_at" },
                    { label: "Created Date", value: "created_at" },
                    { label: "Title", value: "title" },
                  ],
                  onChange: (value) => setSortBy(value as "updated_at" | "created_at" | "title"),
                },
                {
                  label: "Sort Order",
                  value: sortOrder,
                  options: [
                    { label: "Descending", value: "desc" },
                    { label: "Ascending", value: "asc" },
                  ],
                  onChange: (value) => setSortOrder(value as "asc" | "desc"),
                },
              ]}
            />
          </div>
          <div className="dh-filters-mobile-bar">
            <button
              className={`btn btn--secondary dh-btn dh-filters-toggle ${showFiltersMobile ? "dh-filters-toggle--active" : ""}`}
              type="button"
              onClick={openMobileFilters}
              aria-expanded={showFiltersMobile}
              aria-controls="program-filters-mobile-panel"
            >
              <span className="dh-filters-toggle__label">Filter</span>
            </button>
          </div>
        </div>

        {success ? (
          <Card>
            <p className="alert alert--success dh-alert dh-alert--success">{success}</p>
          </Card>
        ) : null}

        {error ? (
          <Card>
            <p className="alert alert--error dh-alert">{error}</p>
          </Card>
        ) : null}

        {loading ? (
          <>
            <Card className="card--table desktop-only dh-table-wrap">
              <div className="program-skeleton-table" aria-hidden>
                <div className="program-skeleton-line program-skeleton-line--lg" />
                <div className="program-skeleton-line" />
                <div className="program-skeleton-line program-skeleton-line--sm" />
                <div className="program-skeleton-line" />
                <div className="program-skeleton-line program-skeleton-line--sm" />
              </div>
            </Card>
            <div className="mobile-only programs-mobile-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <div className="program-skeleton-card" aria-hidden>
                    <div className="program-skeleton-line program-skeleton-line--md" />
                    <div className="program-skeleton-line program-skeleton-line--sm" />
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : null}

        {!loading ? (
          <Card className="card--table desktop-only dh-table-wrap">
            <Table<ProgramRow>
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage="No programs found."
              columns={[
                {
                  key: "title",
                  label: "Title",
                  className: "table-cell-strong",
                  render: (row) => (
                    <button className="program-title-btn" type="button" onClick={() => setSelected(row)}>
                      {row.title}
                    </button>
                  ),
                },
                {
                  key: "description",
                  label: "Description",
                  render: (row) => (
                    <p className="program-description-cell">
                      {row.description || row.summary || "No description available."}
                    </p>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="table-actions dh-table-actions">
                      <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                      <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>
                        Delete
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        ) : null}

        {!loading ? (
          <div className="mobile-only programs-mobile-list">
            {rows.length ? (
              rows.map((row) => (
                <article className="program-mobile-item" key={row.id}>
                  <button className="program-mobile-item__title" type="button" onClick={() => setSelected(row)}>
                    {row.title}
                  </button>
                  <div className="table-actions program-mobile-item__actions">
                    <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button className="btn btn--danger btn--sm dh-btn" type="button" onClick={() => setDeleteTarget(row)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <Card>
                <div className="empty-state">
                  <p className="empty-state__title">No data</p>
                  <p className="empty-state__description">No programs found.</p>
                </div>
              </Card>
            )}
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setSelected(null)}>X</button>
              <h3 className="modal-title">Program Details</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line">
                <strong>Title:</strong> {selected.title}
              </p>
              <p className="post-details__line">
                <strong>Slug:</strong> {selected.slug}
              </p>
              <p className="post-details__line">
                <strong>Summary:</strong> {selected.summary || "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Description:</strong> {selected.description || "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Requirements:</strong> {selected.requirements || "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Default Capacity:</strong> {selected.default_capacity ?? "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Created At:</strong> {formatDateTime(selected.created_at)}
              </p>
              <p className="post-details__line">
                <strong>Updated At:</strong> {formatDateTime(selected.updated_at)}
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                type="button"
                onClick={() => {
                  openEdit(selected);
                  setSelected(null);
                }}
              >
                Edit
              </button>
              <button
                className="btn btn--danger"
                type="button"
                onClick={() => {
                  setDeleteTarget(selected);
                  setSelected(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {formMode ? (
        <div className="modal-overlay" role="presentation" onClick={closeForm}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={closeForm}>X</button>
              <h3 className="modal-title">{formTitle}</h3>
            </header>

            <div className="form-stack">
              <label className="field">
                <span className="field__label">Title</span>
                <input
                  className="field__control"
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>

              <label className="field">
                <span className="field__label">Slug</span>
                <input
                  className="field__control"
                  type="text"
                  autoComplete="off"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="Leave blank to auto-generate from title"
                />
                <span className="dh-field-help">
                  Slug is a unique identifier. If you leave it empty, it is generated from the title.
                </span>
              </label>

              <label className="field">
                <span className="field__label">Summary</span>
                <textarea
                  className="textarea-control"
                  value={form.summary}
                  onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                />
              </label>

              <label className="field">
                <span className="field__label">Description</span>
                <textarea
                  className="textarea-control"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>

              <label className="field">
                <span className="field__label">Requirements</span>
                <textarea
                  className="textarea-control"
                  value={form.requirements}
                  onChange={(event) => setForm((current) => ({ ...current, requirements: event.target.value }))}
                />
              </label>

              <label className="field">
                <span className="field__label">Default Capacity</span>
                <input
                  className="field__control"
                  type="number"
                  min={0}
                  step={1}
                  value={form.defaultCapacity}
                  onChange={(event) => setForm((current) => ({ ...current, defaultCapacity: event.target.value }))}
                />
              </label>
            </div>

            {formError ? <p className="alert alert--error">{formError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={closeForm} disabled={isSubmitting}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-card modal-card--narrow"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setDeleteTarget(null)}>X</button>
              <h3 className="modal-title">Delete Program</h3>
            </header>

            <p className="post-details__line">
              Delete <strong>{deleteTarget.title}</strong>? This action is permanent and removes related cohorts from the database.
            </p>

            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button className="btn btn--danger" type="button" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFiltersMobile ? (
        <div className="dh-filter-modal" role="presentation" onClick={closeMobileFilters}>
          <div
            id="program-filters-mobile-panel"
            className={`dh-filter-sheet ${isFilterDragging ? "dh-filter-sheet--dragging" : ""}`}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{ transform: `translateY(${filterSheetOffset}px)` }}
          >
            <div className="dh-filter-sheet__drag" onPointerDown={handleFilterDragStart}>
              <span className="dh-filter-sheet__grabber" aria-hidden />
              <p className="dh-filter-sheet__title">Filters</p>
            </div>
            <FilterBar
              className="dh-form-grid dh-form-grid--mobile"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search program title"
              selects={[
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Last Updated", value: "updated_at" },
                    { label: "Created Date", value: "created_at" },
                    { label: "Title", value: "title" },
                  ],
                  onChange: (value) => setSortBy(value as "updated_at" | "created_at" | "title"),
                },
                {
                  label: "Sort Order",
                  value: sortOrder,
                  options: [
                    { label: "Descending", value: "desc" },
                    { label: "Ascending", value: "asc" },
                  ],
                  onChange: (value) => setSortOrder(value as "asc" | "desc"),
                },
              ]}
            />
          </div>
        </div>
      ) : null}

    </PageShell>
  );
}




