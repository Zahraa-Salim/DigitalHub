import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { StatsCard } from "../../components/StatsCard";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { ApiError, api, apiList, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";

type ApplicationStatus = "pending" | "approved" | "rejected" | "waitlisted";
type SortBy = "submitted_at" | "status";

type ApplicationRow = {
  id: number;
  cohort_id: number;
  cohort_name: string | null;
  status: ApplicationStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  submitted_at: string;
  applicant_id: number | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  answers?: unknown;
  submission_answers?: unknown;
  application_answers?: unknown;
  metadata?: unknown;
};

type CohortOption = {
  id: number;
  name: string;
};

type ToastTone = "success" | "error";

const defaultPagination: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

const statusOptions: Array<{ label: string; value: string }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Waitlisted", value: "waitlisted" },
];

function extractAnswersPayload(row: ApplicationRow): unknown | null {
  const candidates = [row.answers, row.submission_answers, row.application_answers, row.metadata];
  for (const candidate of candidates) {
    if (candidate && (typeof candidate === "object" || Array.isArray(candidate))) {
      return candidate;
    }
  }
  return null;
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("submitted_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<ApplicationRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApplicationRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [filterSheetOffset, setFilterSheetOffset] = useState(0);
  const [isFilterDragging, setIsFilterDragging] = useState(false);
  const toastIdRef = useRef(1);
  const toastTimersRef = useRef<Record<number, number>>({});
  const filterDragStartYRef = useRef<number | null>(null);
  const filterOffsetRef = useRef(0);

  const showToast = (tone: ToastTone, message: string) => {
    const id = toastIdRef.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    const timeoutId = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      delete toastTimersRef.current[id];
    }, 3400);
    toastTimersRef.current[id] = timeoutId;
  };

  const dismissToast = (id: number) => {
    const timeoutId = toastTimersRef.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete toastTimersRef.current[id];
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    return () => {
      Object.values(toastTimersRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, cohortFilter, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;

    const loadCohorts = async () => {
      try {
        const result = await apiList<CohortOption>(
          `/cohorts${buildQueryString({
            limit: 100,
            sortBy: "updated_at",
            order: "desc",
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

        const message = err instanceof ApiError ? err.message || "Failed to load cohort options." : "Failed to load cohort options.";
        showToast("error", message);
      }
    };

    void loadCohorts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadApplications = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await apiList<ApplicationRow>(
          `/applications${buildQueryString({
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            cohort_id: cohortFilter === "all" ? undefined : Number(cohortFilter),
            sortBy,
            order: sortOrder,
          })}`,
        );

        if (!active) {
          return;
        }

        setApplications(result.data);
        setPagination(result.pagination);
      } catch (err) {
        if (!active) {
          return;
        }

        const message = err instanceof ApiError ? err.message || "Failed to load applications." : "Failed to load applications.";
        setError(message);
        showToast("error", message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadApplications();

    return () => {
      active = false;
    };
  }, [cohortFilter, debouncedSearch, page, refreshKey, sortBy, sortOrder, statusFilter]);

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
        closeMobileFilters();
      }
    };

    closeOnDesktop();
    mediaQuery.addEventListener("change", closeOnDesktop);

    return () => {
      mediaQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [showFiltersMobile]);

  const cohortOptions = useMemo(
    () => [
      { label: "All Cohorts", value: "all" },
      ...cohorts.map((cohort) => ({
        label: cohort.name,
        value: String(cohort.id),
      })),
    ],
    [cohorts],
  );

  const pendingCount = applications.filter((row) => row.status === "pending").length;
  const approvedCount = applications.filter((row) => row.status === "approved").length;
  const rejectedCount = applications.filter((row) => row.status === "rejected").length;
  const lastSubmitted = applications[0]?.submitted_at ?? "";
  const totalPagesSafe = Math.max(pagination.totalPages, 1);
  const hasActiveFilters = search.trim() !== "" || statusFilter !== "pending" || cohortFilter !== "all" || sortBy !== "submitted_at" || sortOrder !== "desc";

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("pending");
    setCohortFilter("all");
    setSortBy("submitted_at");
    setSortOrder("desc");
    setPage(1);
  };

  const approveApplication = async () => {
    if (!approveTarget) {
      return;
    }

    setIsActionLoading(true);
    setError("");

    try {
      await api<{ status: string }>(`/applications/${approveTarget.id}/approve`, {
        method: "PATCH",
      });
      showToast("success", "Application approved successfully.");
      setApproveTarget(null);
      setSelected(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to approve application." : "Failed to approve application.";
      setError(message);
      showToast("error", message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const rejectApplication = async () => {
    if (!rejectTarget) {
      return;
    }

    setIsActionLoading(true);
    setError("");

    const trimmedReason = rejectReason.trim();

    try {
      await api<{ status: string }>(`/applications/${rejectTarget.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify(trimmedReason ? { reason: trimmedReason } : {}),
      });
      showToast("success", "Application rejected successfully.");
      setRejectTarget(null);
      setRejectReason("");
      setSelected(null);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to reject application." : "Failed to reject application.";
      setError(message);
      showToast("error", message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const renderActions = (row: ApplicationRow) => {
    const isPending = row.status === "pending";

    return (
      <div className="table-actions dh-table-actions">
        <button className="btn btn--secondary btn--sm dh-btn btn--view" type="button" onClick={() => setSelected(row)}>
          View
        </button>
        <button
          className="btn btn--primary btn--sm dh-btn"
          type="button"
          onClick={() => setApproveTarget(row)}
          disabled={!isPending}
          title={isPending ? "Approve application" : "Only pending applications can be approved"}
        >
          Approve
        </button>
        <button
          className="btn btn--danger btn--sm dh-btn"
          type="button"
          onClick={() => setRejectTarget(row)}
          disabled={!isPending}
          title={isPending ? "Reject application" : "Only pending applications can be rejected"}
        >
          Reject
        </button>
      </div>
    );
  };

  return (
    <PageShell title="Applications" subtitle="Review and process applicant submissions from real backend data.">
      <div className="dh-page">
        <div className="stats-grid stats-grid--compact dh-stats">
          <StatsCard label="Pending (Page)" value={String(pendingCount)} hint="Awaiting admin decision" />
          <StatsCard label="Approved (Page)" value={String(approvedCount)} hint="Accepted applications" />
          <StatsCard label="Rejected (Page)" value={String(rejectedCount)} hint="Declined applications" />
          <StatsCard
            label="Latest Submission"
            value={lastSubmitted ? formatDateTime(lastSubmitted) : "No records"}
            hint={`Total matching records: ${pagination.total}`}
          />
        </div>

        <div className="dh-filters">
          <div className="dh-filters-desktop-panel">
            <FilterBar
              className="dh-form-grid dh-form-grid--applications"
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search applicant name, email, or phone"
              selects={[
                {
                  label: "Status",
                  value: statusFilter,
                  options: statusOptions,
                  onChange: setStatusFilter,
                },
                {
                  label: "Cohort",
                  value: cohortFilter,
                  options: cohortOptions,
                  onChange: setCohortFilter,
                },
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Submitted At", value: "submitted_at" },
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
              aria-controls="applications-filters-mobile-panel"
            >
              <span className="dh-filters-toggle__label">Filter</span>
            </button>
          </div>
        </div>

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

        {!loading && applications.length ? (
          <Card className="card--table desktop-only dh-table-wrap">
            <Table<ApplicationRow>
              rows={applications}
              rowKey={(row) => row.id}
              emptyMessage="No applications found. Try changing filters or search terms."
              columns={[
                {
                  key: "applicant",
                  label: "Applicant",
                  className: "table-cell-strong",
                  render: (row) => (
                    <button className="program-title-btn" type="button" onClick={() => setSelected(row)}>
                      {row.full_name || "Unnamed applicant"}
                    </button>
                  ),
                },
                {
                  key: "email",
                  label: "Email",
                  render: (row) => row.email || "N/A",
                },
                {
                  key: "phone",
                  label: "Phone",
                  render: (row) => row.phone || "N/A",
                },
                {
                  key: "cohort",
                  label: "Cohort",
                  render: (row) => row.cohort_name || `#${row.cohort_id}`,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => <Badge tone={row.status}>{row.status}</Badge>,
                },
                {
                  key: "submitted",
                  label: "Submitted",
                  render: (row) => formatDateTime(row.submitted_at),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => renderActions(row),
                },
              ]}
            />
          </Card>
        ) : null}

        {!loading && !applications.length ? (
          <Card className="desktop-only">
            <div className="empty-state">
              <p className="empty-state__title">No applications found</p>
              <p className="empty-state__description">No records match your current filters.</p>
              {hasActiveFilters ? (
                <div className="table-actions empty-state__actions">
                  <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={clearFilters}>
                    Clear Filters
                  </button>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        {!loading ? (
          <div className="mobile-only programs-mobile-list">
            {applications.length ? (
              applications.map((row) => (
                <article className="program-mobile-item application-mobile-item" key={row.id}>
                  <button className="program-mobile-item__title" type="button" onClick={() => setSelected(row)}>
                    {row.full_name || "Unnamed applicant"}
                  </button>
                  <p className="info-text application-mobile-item__meta">
                    <strong>Email:</strong> {row.email || "N/A"}
                  </p>
                  <p className="info-text application-mobile-item__meta">
                    <strong>Phone:</strong> {row.phone || "N/A"}
                  </p>
                  <p className="info-text application-mobile-item__meta">
                    <strong>Cohort:</strong> {row.cohort_name || `#${row.cohort_id}`}
                  </p>
                  <p className="info-text application-mobile-item__meta">
                    <strong>Submitted:</strong> {formatDateTime(row.submitted_at)}
                  </p>
                  <div className="application-mobile-item__status">
                    <Badge tone={row.status}>{row.status}</Badge>
                  </div>
                  <div className="table-actions program-mobile-item__actions application-mobile-item__actions">
                    <button className="btn btn--secondary btn--sm dh-btn btn--view" type="button" onClick={() => setSelected(row)}>
                      View
                    </button>
                    <button
                      className="btn btn--primary btn--sm dh-btn"
                      type="button"
                      onClick={() => setApproveTarget(row)}
                      disabled={row.status !== "pending"}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn--danger btn--sm dh-btn"
                      type="button"
                      onClick={() => setRejectTarget(row)}
                      disabled={row.status !== "pending"}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <Card>
                <div className="empty-state">
                  <p className="empty-state__title">No applications found</p>
                  <p className="empty-state__description">No records match your current filters.</p>
                  {hasActiveFilters ? (
                    <div className="table-actions empty-state__actions">
                      <button className="btn btn--secondary btn--sm dh-btn" type="button" onClick={clearFilters}>
                        Clear Filters
                      </button>
                    </div>
                  ) : null}
                </div>
              </Card>
            )}
          </div>
        ) : null}

        {!loading && pagination.total > 0 ? (
          <Card>
            <Pagination page={pagination.page} totalPages={totalPagesSafe} onChange={setPage} />
          </Card>
        ) : null}
      </div>

      {selected ? (
        <div className="modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setSelected(null)}>X</button>
              <h3 className="modal-title">Application Details</h3>
            </header>

            <div className="post-details">
              <p className="post-details__line">
                <strong>Applicant:</strong> {selected.full_name || "Unnamed applicant"}
              </p>
              <p className="post-details__line">
                <strong>Email:</strong> {selected.email || "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Phone:</strong> {selected.phone || "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Cohort:</strong> {selected.cohort_name || `#${selected.cohort_id}`}
              </p>
              <p className="post-details__line">
                <strong>Status:</strong> {selected.status}
              </p>
              <p className="post-details__line">
                <strong>Submitted At:</strong> {formatDateTime(selected.submitted_at)}
              </p>
              <p className="post-details__line">
                <strong>Reviewed At:</strong> {selected.reviewed_at ? formatDateTime(selected.reviewed_at) : "Not reviewed yet"}
              </p>
              <p className="post-details__line">
                <strong>Reviewed By:</strong> {selected.reviewed_by ?? "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Applicant ID:</strong> {selected.applicant_id ?? "N/A"}
              </p>
            </div>

            <div className="post-details application-json-block">
              <p className="post-details__line">
                <strong>Submission Answers</strong>
              </p>
              {extractAnswersPayload(selected) ? (
                <pre className="metadata-block application-json-preview">{formatJson(extractAnswersPayload(selected))}</pre>
              ) : (
                <p className="post-details__line">No submission answers available from this endpoint.</p>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => setApproveTarget(selected)}
                disabled={selected.status !== "pending"}
              >
                Approve
              </button>
              <button
                className="btn btn--danger"
                type="button"
                onClick={() => setRejectTarget(selected)}
                disabled={selected.status !== "pending"}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {approveTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => setApproveTarget(null)}>
          <div
            className="modal-card modal-card--narrow"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h3 className="modal-title">Approve Application</h3>
            </header>
            <p className="post-details__line">
              Approve <strong>{approveTarget.full_name || "this applicant"}</strong> for{" "}
              <strong>{approveTarget.cohort_name || `#${approveTarget.cohort_id}`}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setApproveTarget(null)} disabled={isActionLoading}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={approveApplication} disabled={isActionLoading}>
                {isActionLoading ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => setRejectTarget(null)}>
          <div
            className="modal-card modal-card--narrow"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h3 className="modal-title">Reject Application</h3>
            </header>
            <p className="post-details__line">
              Reject <strong>{rejectTarget.full_name || "this applicant"}</strong>? You can include an optional reason.
            </p>
            <label className="field">
              <span className="field__label">Reason (optional)</span>
              <textarea
                className="textarea-control"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Add context for the rejection."
              />
            </label>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button className="btn btn--danger" type="button" onClick={rejectApplication} disabled={isActionLoading}>
                {isActionLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFiltersMobile ? (
        <div className="dh-filter-modal" role="presentation" onClick={closeMobileFilters}>
          <div
            id="applications-filters-mobile-panel"
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
              searchPlaceholder="Search applicant name, email, or phone"
              selects={[
                {
                  label: "Status",
                  value: statusFilter,
                  options: statusOptions,
                  onChange: setStatusFilter,
                },
                {
                  label: "Cohort",
                  value: cohortFilter,
                  options: cohortOptions,
                  onChange: setCohortFilter,
                },
                {
                  label: "Sort By",
                  value: sortBy,
                  options: [
                    { label: "Submitted At", value: "submitted_at" },
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

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PageShell>
  );
}



