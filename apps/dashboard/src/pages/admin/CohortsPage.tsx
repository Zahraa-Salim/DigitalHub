import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { StatsCard } from "../../components/StatsCard";
import { Table } from "../../components/Table";
import { ApiError, api, apiList } from "../../utils/api";
import { formatDate, formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";

type CohortStatus = "planned" | "coming_soon" | "open" | "running" | "completed" | "cancelled";
type SortBy = "updated_at" | "created_at" | "name" | "start_date" | "status";

type CohortRow = {
  id: number;
  program_id: number;
  program_title: string;
  name: string;
  status: CohortStatus;
  allow_applications: boolean;
  capacity: number | null;
  enrollment_open_at: string | null;
  enrollment_close_at: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

type ProgramOption = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  default_capacity: number | null;
};

type CohortFormState = {
  programId: string;
  name: string;
  status: CohortStatus;
  allowApplications: boolean;
  capacity: string;
  enrollmentOpenAt: string;
  enrollmentCloseAt: string;
  startDate: string;
  endDate: string;
};

type ProgramInlineFormState = {
  title: string;
  slug: string;
  summary: string;
  defaultCapacity: string;
};

type FormMode = "create" | "edit" | null;

const NEW_PROGRAM_VALUE = "__new_program__";

const initialCohortForm: CohortFormState = {
  programId: "",
  name: "",
  status: "planned",
  allowApplications: false,
  capacity: "",
  enrollmentOpenAt: "",
  enrollmentCloseAt: "",
  startDate: "",
  endDate: "",
};

const initialInlineProgramForm: ProgramInlineFormState = {
  title: "",
  slug: "",
  summary: "",
  defaultCapacity: "",
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalized;
}

function toDateTimeInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toCohortFormState(cohort: CohortRow | null): CohortFormState {
  if (!cohort) {
    return initialCohortForm;
  }

  return {
    programId: String(cohort.program_id),
    name: cohort.name,
    status: cohort.status,
    allowApplications: cohort.allow_applications,
    capacity: cohort.capacity === null ? "" : String(cohort.capacity),
    enrollmentOpenAt: toDateTimeInputValue(cohort.enrollment_open_at),
    enrollmentCloseAt: toDateTimeInputValue(cohort.enrollment_close_at),
    startDate: toDateInputValue(cohort.start_date),
    endDate: toDateInputValue(cohort.end_date),
  };
}

function parseCapacity(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Capacity must be a whole number greater than or equal to 0.");
  }

  return parsed;
}

function parseProgramCapacity(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Program default capacity must be a whole number greater than or equal to 0.");
  }

  return parsed;
}

export function CohortsPage() {
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [allowApplicationsFilter, setAllowApplicationsFilter] = useState<"all" | "true" | "false">("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [filterSheetOffset, setFilterSheetOffset] = useState(0);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<CohortRow | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<CohortRow | null>(null);
  const [form, setForm] = useState<CohortFormState>(initialCohortForm);
  const [inlineProgramForm, setInlineProgramForm] = useState<ProgramInlineFormState>(initialInlineProgramForm);
  const [isInlineProgramOpen, setIsInlineProgramOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CohortRow | null>(null);
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
      try {
        const result = await apiList<ProgramOption>(
          `/programs${buildQueryString({
            limit: 100,
            sortBy: "title",
            order: "asc",
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
      }
    };

    void loadPrograms();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadCohorts = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await apiList<CohortRow>(
          `/cohorts${buildQueryString({
            search: debouncedSearch || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            limit: 100,
            sortBy,
            order: sortOrder,
          })}`,
        );

        if (!active) {
          return;
        }

        setCohorts(result.data);
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message || "Failed to load cohorts.");
        } else {
          setError("Failed to load cohorts.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCohorts();

    return () => {
      active = false;
    };
  }, [debouncedSearch, statusFilter, refreshKey, sortBy, sortOrder]);

  const rows = useMemo(
    () =>
      cohorts.filter((row) => {
        if (programFilter !== "all" && String(row.program_id) !== programFilter) {
          return false;
        }

        if (allowApplicationsFilter !== "all" && String(row.allow_applications) !== allowApplicationsFilter) {
          return false;
        }

        return true;
      }),
    [allowApplicationsFilter, cohorts, programFilter],
  );

  const totalCohorts = rows.length;
  const openCount = rows.filter((row) => row.status === "open").length;
  const lastUpdated = rows[0]?.updated_at ?? "";
  const formTitle = formMode === "create" ? "Add Cohort" : "Edit Cohort";

  const closeMobileFilters = () => {
    setShowFiltersMobile(false);
    setIsFilterDragging(false);
    setFilterSheetOffset(0);
    filterOffsetRef.current = 0;
    filterDragStartYRef.current = null;
  };

  const openMobileFilters = () => {
    setShowFiltersMobile(true);
    setFilterSheetOffset(0);
    filterOffsetRef.current = 0;
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
        closeMobileFilters();
      }
    };

    closeOnDesktop();
    mediaQuery.addEventListener("change", closeOnDesktop);

    return () => {
      mediaQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [showFiltersMobile]);

  const openCreate = () => {
    const firstProgramId = programs[0]?.id ? String(programs[0].id) : "";
    setFormMode("create");
    setEditing(null);
    setForm({
      ...initialCohortForm,
      programId: firstProgramId,
    });
    setInlineProgramForm(initialInlineProgramForm);
    setIsInlineProgramOpen(false);
    setFormError("");
    setSuccess("");
  };

  const openEdit = (cohort: CohortRow) => {
    setFormMode("edit");
    setEditing(cohort);
    setForm(toCohortFormState(cohort));
    setInlineProgramForm(initialInlineProgramForm);
    setIsInlineProgramOpen(false);
    setFormError("");
    setSuccess("");
  };

  const closeForm = () => {
    if (isSubmitting) {
      return;
    }

    setFormMode(null);
    setEditing(null);
    setInlineProgramForm(initialInlineProgramForm);
    setIsInlineProgramOpen(false);
    setFormError("");
  };

  const openInlineProgram = () => {
    setIsInlineProgramOpen(true);
    setForm((current) => ({ ...current, programId: NEW_PROGRAM_VALUE }));
    setInlineProgramForm(initialInlineProgramForm);
  };

  const createProgramInline = async (): Promise<ProgramOption> => {
    const title = inlineProgramForm.title.trim();
    const rawSlug = inlineProgramForm.slug.trim() || title;
    const slug = slugify(rawSlug);

    if (!title) {
      throw new Error("Program title is required when adding a new program.");
    }

    if (!slug) {
      throw new Error("Program slug is required when adding a new program.");
    }

    const defaultCapacity = parseProgramCapacity(inlineProgramForm.defaultCapacity);

    const payload: Record<string, unknown> = {
      slug,
      title,
      summary: inlineProgramForm.summary.trim(),
      is_published: true,
    };

    if (defaultCapacity !== undefined) {
      payload.default_capacity = defaultCapacity;
    }

    const created = await api<ProgramOption>("/programs", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setPrograms((current) => {
      const next = [...current, created];
      next.sort((a, b) => a.title.localeCompare(b.title));
      return next;
    });

    return created;
  };

  const handleSave = async () => {
    const cohortName = form.name.trim();
    if (!cohortName) {
      setFormError("Cohort name is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setError("");

    try {
      let programIdValue = form.programId;

      if (programIdValue === NEW_PROGRAM_VALUE || isInlineProgramOpen) {
        const createdProgram = await createProgramInline();
        programIdValue = String(createdProgram.id);
        setInlineProgramForm(initialInlineProgramForm);
        setIsInlineProgramOpen(false);
      }

      const programId = Number(programIdValue);
      if (!Number.isInteger(programId) || programId <= 0) {
        setFormError("Program selection is required.");
        return;
      }

      const capacity = parseCapacity(form.capacity);
      const enrollmentOpenAt = toIsoDateTime(form.enrollmentOpenAt);
      const enrollmentCloseAt = toIsoDateTime(form.enrollmentCloseAt);

      if (form.enrollmentOpenAt && !enrollmentOpenAt) {
        setFormError("Enrollment open date/time is invalid.");
        return;
      }

      if (form.enrollmentCloseAt && !enrollmentCloseAt) {
        setFormError("Enrollment close date/time is invalid.");
        return;
      }

      if (form.allowApplications && !enrollmentOpenAt && !enrollmentCloseAt) {
        setFormError("Allow Applications cannot be enabled without enrollment date/time.");
        return;
      }

      const payload = {
        program_id: programId,
        name: cohortName,
        status: form.status,
        allow_applications: form.allowApplications,
        capacity,
        enrollment_open_at: enrollmentOpenAt,
        enrollment_close_at: enrollmentCloseAt,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
      };

      if (formMode === "create") {
        await api<CohortRow>("/cohorts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Cohort added successfully.");
      } else if (formMode === "edit" && editing) {
        await api<CohortRow>(`/cohorts/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccess("Cohort updated successfully.");
      }

      setFormMode(null);
      setEditing(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || "Failed to save cohort.");
      } else if (err instanceof Error) {
        setFormError(err.message || "Failed to save cohort.");
      } else {
        setFormError("Failed to save cohort.");
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
      await api<{ id: number }>(`/cohorts/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setSuccess("Cohort deleted successfully.");
      setDeleteTarget(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to delete cohort.");
      } else {
        setError("Failed to delete cohort.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageShell
      title="Cohorts"
      subtitle="Manage cohorts and link them directly to programs from database."
      actions={
        <button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={openCreate}>
          Add Cohort
        </button>
      }
    >
      <div className="dh-page">
        <div className="stats-grid stats-grid--compact dh-stats">
          <StatsCard label="Total Cohorts" value={String(totalCohorts)} hint="Rows after current filters" />
          <StatsCard label="Open Cohorts" value={String(openCount)} hint="Accepting applications" />
          <StatsCard
            label="Last Updated"
            value={lastUpdated ? formatDateTime(lastUpdated) : "No records"}
            hint="Most recently changed"
          />
        </div>

        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar
              className="dh-form-grid dh-form-grid--cohorts"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search cohort or program"
              selects={[
                {
                  label: "Status",
                  value: statusFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Planned", value: "planned" },
                    { label: "Coming Soon", value: "coming_soon" },
                    { label: "Open", value: "open" },
                    { label: "Running", value: "running" },
                    { label: "Completed", value: "completed" },
                    { label: "Cancelled", value: "cancelled" },
                  ],
                  onChange: setStatusFilter,
                },
                {
                  label: "Allow Applications",
                  value: allowApplicationsFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Enabled", value: "true" },
                    { label: "Disabled", value: "false" },
                  ],
                  onChange: (value) => setAllowApplicationsFilter(value as "all" | "true" | "false"),
                },
                {
                  label: "Program",
                  value: programFilter,
                  options: [
                    { label: "All Programs", value: "all" },
                    ...programs.map((programOption) => ({
                      label: programOption.title,
                      value: String(programOption.id),
                    })),
                  ],
                  onChange: setProgramFilter,
                },
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Last Updated", value: "updated_at" },
                    { label: "Created Date", value: "created_at" },
                    { label: "Start Date", value: "start_date" },
                    { label: "Name", value: "name" },
                    { label: "Status", value: "status" },
                  ],
                  onChange: (value) => setSortBy(value as SortBy),
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
              aria-controls="cohort-filters-mobile-panel"
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
            <Table<CohortRow>
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage="No cohorts found."
              columns={[
                {
                  key: "name",
                  label: "Cohort",
                  className: "table-cell-strong",
                  render: (row) => (
                    <button className="program-title-btn" type="button" onClick={() => setSelected(row)}>
                      {row.name}
                    </button>
                  ),
                },
                {
                  key: "program",
                  label: "Program",
                  render: (row) => row.program_title,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => <Badge tone={row.status}>{row.status}</Badge>,
                },
                {
                  key: "allow_applications",
                  label: "Allow Applications",
                  render: (row) => (
                    <Badge tone={row.allow_applications ? "published" : "unpublished"}>
                      {row.allow_applications ? "enabled" : "disabled"}
                    </Badge>
                  ),
                },
                {
                  key: "capacity",
                  label: "Capacity",
                  render: (row) => row.capacity ?? "N/A",
                },
                {
                  key: "start_date",
                  label: "Start Date",
                  render: (row) => (row.start_date ? formatDate(row.start_date) : "N/A"),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="table-actions dh-table-actions">
                      <button className="btn btn--secondary btn--sm dh-btn btn--edit" type="button" onClick={() => openEdit(row)}>
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
                    {row.name}
                  </button>
                  <p className="info-text">
                    Allow Applications: <span className="text-strong">{row.allow_applications ? "Enabled" : "Disabled"}</span>
                  </p>
                  <div className="table-actions program-mobile-item__actions">
                    <button className="btn btn--secondary btn--sm dh-btn btn--edit" type="button" onClick={() => openEdit(row)}>
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
                  <p className="empty-state__description">No cohorts found.</p>
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
              <h3 className="modal-title">Cohort Details</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line">
                <strong>Name:</strong> {selected.name}
              </p>
              <p className="post-details__line">
                <strong>Program:</strong> {selected.program_title}
              </p>
              <p className="post-details__line">
                <strong>Status:</strong> {selected.status}
              </p>
              <p className="post-details__line">
                <strong>Allow Applications:</strong> {selected.allow_applications ? "Yes" : "No"}
              </p>
              <p className="post-details__line">
                <strong>Capacity:</strong> {selected.capacity ?? "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Enrollment Open:</strong> {selected.enrollment_open_at ? formatDateTime(selected.enrollment_open_at) : "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Enrollment Close:</strong> {selected.enrollment_close_at ? formatDateTime(selected.enrollment_close_at) : "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Start Date:</strong> {selected.start_date ? formatDate(selected.start_date) : "N/A"}
              </p>
              <p className="post-details__line">
                <strong>End Date:</strong> {selected.end_date ? formatDate(selected.end_date) : "N/A"}
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
              <h3 className="modal-title">{formTitle}</h3>
            </header>

            <div className="form-stack">
              <label className="field">
                <span className="field__label">Program</span>
                <select
                  className="field__control"
                  value={form.programId}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((current) => ({ ...current, programId: nextValue }));
                    if (nextValue === NEW_PROGRAM_VALUE) {
                      setIsInlineProgramOpen(true);
                    } else {
                      setIsInlineProgramOpen(false);
                    }
                  }}
                >
                  <option value="">Select program</option>
                  {programs.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                  <option value={NEW_PROGRAM_VALUE}>+ Add new program here</option>
                </select>
              </label>

              {!isInlineProgramOpen ? (
                <button className="btn btn--secondary btn--sm cohort-inline-program__toggle" type="button" onClick={openInlineProgram}>
                  Add New Program
                </button>
              ) : null}

              {isInlineProgramOpen ? (
                <div className="cohort-inline-program">
                  <p className="cohort-inline-program__title">New Program</p>
                  <div className="cohort-inline-program__grid">
                    <label className="field">
                      <span className="field__label">Program Title</span>
                      <input
                        className="field__control"
                        type="text"
                        value={inlineProgramForm.title}
                        onChange={(event) =>
                          setInlineProgramForm((current) => ({ ...current, title: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="field__label">Program Slug</span>
                      <input
                        className="field__control"
                        type="text"
                        value={inlineProgramForm.slug}
                        onChange={(event) =>
                          setInlineProgramForm((current) => ({ ...current, slug: event.target.value }))
                        }
                        placeholder="Auto-generated if empty"
                      />
                    </label>
                    <label className="field cohort-inline-program__field-wide">
                      <span className="field__label">Program Summary</span>
                      <textarea
                        className="textarea-control"
                        value={inlineProgramForm.summary}
                        onChange={(event) =>
                          setInlineProgramForm((current) => ({ ...current, summary: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="field__label">Program Default Capacity</span>
                      <input
                        className="field__control"
                        type="number"
                        min={0}
                        step={1}
                        value={inlineProgramForm.defaultCapacity}
                        onChange={(event) =>
                          setInlineProgramForm((current) => ({ ...current, defaultCapacity: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <label className="field">
                <span className="field__label">Cohort Name</span>
                <input
                  className="field__control"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <div className="cohort-form-grid">
                <label className="field">
                  <span className="field__label">Status</span>
                  <select
                    className="field__control"
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, status: event.target.value as CohortStatus }))
                    }
                  >
                    <option value="planned">Planned</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="open">Open</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Capacity</span>
                  <input
                    className="field__control"
                    type="number"
                    min={0}
                    step={1}
                    value={form.capacity}
                    onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                  />
                </label>
              </div>

              <label className="field cohort-form-switch">
                <span className="field__label">Allow Applications</span>
                <input
                  className="cohort-form-switch__checkbox"
                  type="checkbox"
                  checked={form.allowApplications}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, allowApplications: event.target.checked }))
                  }
                />
              </label>

              <div className="cohort-form-grid">
                <label className="field">
                  <span className="field__label">Enrollment Opens</span>
                  <input
                    className="field__control"
                    type="datetime-local"
                    value={form.enrollmentOpenAt}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, enrollmentOpenAt: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span className="field__label">Enrollment Closes</span>
                  <input
                    className="field__control"
                    type="datetime-local"
                    value={form.enrollmentCloseAt}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, enrollmentCloseAt: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span className="field__label">Start Date</span>
                  <input
                    className="field__control"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </label>

                <label className="field">
                  <span className="field__label">End Date</span>
                  <input
                    className="field__control"
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  />
                </label>
              </div>
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
              <h3 className="modal-title">Delete Cohort</h3>
            </header>

            <p className="post-details__line">
              Delete <strong>{deleteTarget.name}</strong>? This will soft-delete the cohort and disable applications.
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
            id="cohort-filters-mobile-panel"
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
              searchPlaceholder="Search cohort or program"
              selects={[
                {
                  label: "Status",
                  value: statusFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Planned", value: "planned" },
                    { label: "Coming Soon", value: "coming_soon" },
                    { label: "Open", value: "open" },
                    { label: "Running", value: "running" },
                    { label: "Completed", value: "completed" },
                    { label: "Cancelled", value: "cancelled" },
                  ],
                  onChange: setStatusFilter,
                },
                {
                  label: "Allow Applications",
                  value: allowApplicationsFilter,
                  options: [
                    { label: "All", value: "all" },
                    { label: "Enabled", value: "true" },
                    { label: "Disabled", value: "false" },
                  ],
                  onChange: (value) => setAllowApplicationsFilter(value as "all" | "true" | "false"),
                },
                {
                  label: "Program",
                  value: programFilter,
                  options: [
                    { label: "All Programs", value: "all" },
                    ...programs.map((programOption) => ({
                      label: programOption.title,
                      value: String(programOption.id),
                    })),
                  ],
                  onChange: setProgramFilter,
                },
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Last Updated", value: "updated_at" },
                    { label: "Created Date", value: "created_at" },
                    { label: "Start Date", value: "start_date" },
                    { label: "Name", value: "name" },
                    { label: "Status", value: "status" },
                  ],
                  onChange: (value) => setSortBy(value as SortBy),
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




