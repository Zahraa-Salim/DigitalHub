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
  review_message?: string | null;
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
type ReviewAction = "approve" | "reject";
type ReviewModalState = {
  action: ReviewAction;
  targets: ApplicationRow[];
};
type DecisionBucketEntry = {
  action: ReviewAction;
  row: ApplicationRow;
};

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

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "N/A";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatAnswerValue(item)).join(", ");
  }

  return formatJson(value);
}

function buildAnswerEntries(value: unknown): Array<{ key: string; value: string }> {
  if (Array.isArray(value)) {
    return value.map((entry, index) => ({
      key: `Answer ${index + 1}`,
      value: formatAnswerValue(entry),
    }));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({
      key: key.replace(/_/g, " "),
      value: formatAnswerValue(entry),
    }));
  }

  return [];
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [decisionBucket, setDecisionBucket] = useState<Record<number, DecisionBucketEntry>>({});
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [sendByEmail, setSendByEmail] = useState(true);
  const [sendByPhone, setSendByPhone] = useState(true);
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
        setSelectedIds((current) => {
          if (!current.length) {
            return current;
          }

          const pendingIds = new Set(result.data.filter((row) => row.status === "pending").map((row) => row.id));
          return current.filter((id) => pendingIds.has(id));
        });
        setDecisionBucket((current) => {
          if (!Object.keys(current).length) {
            return current;
          }

          const next = { ...current };
          result.data.forEach((row) => {
            const entry = next[row.id];
            if (!entry) {
              return;
            }

            if (row.status !== "pending") {
              delete next[row.id];
              return;
            }

            next[row.id] = {
              ...entry,
              row,
            };
          });

          return next;
        });
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
    setSelectedIds([]);
  };

  const pendingRows = useMemo(() => applications.filter((row) => row.status === "pending"), [applications]);
  const pendingIds = useMemo(() => pendingRows.map((row) => row.id), [pendingRows]);
  const groupedApprovedRows = useMemo(
    () => Object.values(decisionBucket).filter((entry) => entry.action === "approve").map((entry) => entry.row),
    [decisionBucket],
  );
  const groupedRejectedRows = useMemo(
    () => Object.values(decisionBucket).filter((entry) => entry.action === "reject").map((entry) => entry.row),
    [decisionBucket],
  );
  const selectedPendingRows = useMemo(
    () => pendingRows.filter((row) => selectedIds.includes(row.id)),
    [pendingRows, selectedIds],
  );
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedIds.includes(id));
  const selectedCount = selectedPendingRows.length;
  const selectedAnswerEntries = useMemo(() => {
    if (!selected) {
      return [];
    }
    return buildAnswerEntries(extractAnswersPayload(selected));
  }, [selected]);

  const toggleRowSelection = (id: number) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((entry) => entry !== id);
      }
      return [...current, id];
    });
  };

  const toggleSelectAllPending = () => {
    setSelectedIds((current) => {
      if (allPendingSelected) {
        const pendingIdSet = new Set(pendingIds);
        return current.filter((id) => !pendingIdSet.has(id));
      }
      const merged = new Set([...current, ...pendingIds]);
      return Array.from(merged);
    });
  };

  const setRowDecision = (row: ApplicationRow, action: ReviewAction) => {
    if (row.status !== "pending") {
      showToast("error", "Only pending applications can be grouped.");
      return;
    }

    setDecisionBucket((current) => {
      const next = { ...current };
      if (next[row.id]?.action === action) {
        delete next[row.id];
      } else {
        next[row.id] = { action, row };
      }
      return next;
    });
  };

  const setRowsDecision = (rows: ApplicationRow[], action: ReviewAction) => {
    const pendingTargets = rows.filter((row) => row.status === "pending");
    if (!pendingTargets.length) {
      showToast("error", "Only pending applications can be grouped.");
      return;
    }

    setDecisionBucket((current) => {
      const next = { ...current };
      pendingTargets.forEach((row) => {
        next[row.id] = { action, row };
      });
      return next;
    });
    showToast(
      "success",
      `${pendingTargets.length} application(s) added to ${action === "approve" ? "Accepted" : "Rejected"} group.`,
    );
  };

  const addSelectedToGroup = (action: ReviewAction) => {
    if (!selectedPendingRows.length) {
      showToast("error", "Select at least one pending application first.");
      return;
    }
    setRowsDecision(selectedPendingRows, action);
  };

  const openReviewModalForGroup = (action: ReviewAction) => {
    const targets = action === "approve" ? groupedApprovedRows : groupedRejectedRows;
    if (!targets.length) {
      showToast("error", `No applications in ${action === "approve" ? "Accepted" : "Rejected"} group.`);
      return;
    }
    setReviewMessage("");
    setSendByEmail(true);
    setSendByPhone(true);
    setReviewModal({
      action,
      targets,
    });
  };

  const submitReviewAction = async () => {
    if (!reviewModal || !reviewModal.targets.length) {
      return;
    }
    if (!sendByEmail && !sendByPhone) {
      showToast("error", "Select at least one channel: email or phone.");
      return;
    }

    setIsActionLoading(true);
    setError("");

    const trimmedMessage = reviewMessage.trim();
    const endpoint = reviewModal.action === "approve" ? "approve" : "reject";
    const payload = {
      ...(trimmedMessage ? { message: trimmedMessage } : {}),
      ...(reviewModal.action === "reject" && trimmedMessage ? { reason: trimmedMessage } : {}),
      send_email: sendByEmail,
      send_phone: sendByPhone,
    };

    try {
      const results = await Promise.allSettled(
        reviewModal.targets.map((target) =>
          api<{ status: string }>(`/applications/${target.id}/${endpoint}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          }),
        ),
      );

      const successfulIds: number[] = [];
      const failedReasons: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successfulIds.push(reviewModal.targets[index].id);
        } else {
          const reason = result.reason;
          if (reason instanceof ApiError) {
            failedReasons.push(reason.message || "Request failed.");
          } else {
            failedReasons.push("Request failed.");
          }
        }
      });

      if (successfulIds.length) {
        const actionLabel = reviewModal.action === "approve" ? "approved" : "rejected";
        showToast("success", `${successfulIds.length} application(s) ${actionLabel} and message queued successfully.`);
        setRefreshKey((current) => current + 1);
        setSelectedIds((current) => current.filter((id) => !successfulIds.includes(id)));
        setDecisionBucket((current) => {
          const next = { ...current };
          successfulIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });
        if (selected && successfulIds.includes(selected.id)) {
          setSelected(null);
        }
      }

      if (failedReasons.length) {
        const uniqueReasons = Array.from(new Set(failedReasons));
        showToast("error", uniqueReasons[0] || "Some applications could not be updated.");
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message || "Failed to process application action." : "Failed to process application action.";
      setError(message);
      showToast("error", message);
    } finally {
      setIsActionLoading(false);
      setReviewModal(null);
      setReviewMessage("");
      setSendByEmail(true);
      setSendByPhone(true);
    }
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
          <>
            <Card className="applications-bulk-card">
              <div className="applications-bulk-actions">
                <label className="applications-select-all">
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    onChange={toggleSelectAllPending}
                    disabled={!pendingIds.length || isActionLoading}
                  />
                  <span>Select all pending on this page</span>
                </label>
                <div className="applications-bulk-actions__buttons">
                  <span className="info-text applications-bulk-actions__count">{selectedCount} selected</span>
                  <button
                    className="btn btn--primary btn--sm dh-btn"
                    type="button"
                    onClick={() => addSelectedToGroup("approve")}
                    disabled={!selectedCount || isActionLoading}
                  >
                    Group As Accepted
                  </button>
                  <button
                    className="btn btn--danger btn--sm dh-btn"
                    type="button"
                    onClick={() => addSelectedToGroup("reject")}
                    disabled={!selectedCount || isActionLoading}
                  >
                    Group As Rejected
                  </button>
                </div>
              </div>
            </Card>

            <Card className="applications-groups-card">
              <div className="applications-groups-grid">
                <section className="applications-group applications-group--approve">
                  <p className="applications-group__title">Accepted Group</p>
                  <p className="applications-group__count">{groupedApprovedRows.length}</p>
                  <p className="info-text applications-group__preview">
                    {groupedApprovedRows.length
                      ? groupedApprovedRows
                          .slice(0, 3)
                          .map((row) => row.full_name || `#${row.id}`)
                          .join(", ")
                      : "No applications grouped yet."}
                  </p>
                  <button
                    className="btn btn--primary btn--sm dh-btn"
                    type="button"
                    onClick={() => openReviewModalForGroup("approve")}
                    disabled={!groupedApprovedRows.length || isActionLoading}
                  >
                    Send Accepted Group
                  </button>
                </section>
                <section className="applications-group applications-group--reject">
                  <p className="applications-group__title">Rejected Group</p>
                  <p className="applications-group__count">{groupedRejectedRows.length}</p>
                  <p className="info-text applications-group__preview">
                    {groupedRejectedRows.length
                      ? groupedRejectedRows
                          .slice(0, 3)
                          .map((row) => row.full_name || `#${row.id}`)
                          .join(", ")
                      : "No applications grouped yet."}
                  </p>
                  <button
                    className="btn btn--danger btn--sm dh-btn"
                    type="button"
                    onClick={() => openReviewModalForGroup("reject")}
                    disabled={!groupedRejectedRows.length || isActionLoading}
                  >
                    Send Rejected Group
                  </button>
                </section>
              </div>
            </Card>

            <Card className="card--table desktop-only dh-table-wrap">
              <Table<ApplicationRow>
                rows={applications}
                rowKey={(row) => row.id}
                emptyMessage="No applications found. Try changing filters or search terms."
                columns={[
                  {
                    key: "select",
                    label: (
                      <input
                        type="checkbox"
                        aria-label="Select all pending applications"
                        checked={allPendingSelected}
                        onChange={toggleSelectAllPending}
                        disabled={!pendingIds.length || isActionLoading}
                      />
                    ),
                    className: "application-select-cell",
                    render: (row) => (
                      <input
                        type="checkbox"
                        aria-label={`Select application ${row.id}`}
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        disabled={row.status !== "pending" || isActionLoading}
                      />
                    ),
                  },
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
                    key: "cohort",
                    label: "Cohort",
                    render: (row) => row.cohort_name || `#${row.cohort_id}`,
                  },
                  {
                    key: "group",
                    label: "Group",
                    render: (row) =>
                      decisionBucket[row.id]?.action === "approve" ? (
                        <Badge tone="approved">accepted</Badge>
                      ) : decisionBucket[row.id]?.action === "reject" ? (
                        <Badge tone="rejected">rejected</Badge>
                      ) : (
                        <span className="info-text info-text--small">Not grouped</span>
                      ),
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
                    render: (row) => (
                      <div className="table-actions dh-table-actions application-row-actions">
                        <button
                          className={`btn btn--sm dh-btn ${decisionBucket[row.id]?.action === "approve" ? "btn--primary" : "btn--secondary"}`}
                          type="button"
                          onClick={() => setRowDecision(row, "approve")}
                          disabled={row.status !== "pending" || isActionLoading}
                        >
                          Accept
                        </button>
                        <button
                          className={`btn btn--sm dh-btn ${decisionBucket[row.id]?.action === "reject" ? "btn--danger" : "btn--secondary"}`}
                          type="button"
                          onClick={() => setRowDecision(row, "reject")}
                          disabled={row.status !== "pending" || isActionLoading}
                        >
                          Reject
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </>
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
                  <div className="application-mobile-item__head">
                    <input
                      type="checkbox"
                      aria-label={`Select application ${row.id}`}
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleRowSelection(row.id)}
                      disabled={row.status !== "pending" || isActionLoading}
                    />
                    <button className="program-mobile-item__title" type="button" onClick={() => setSelected(row)}>
                      {row.full_name || "Unnamed applicant"}
                    </button>
                  </div>
                  <p className="info-text application-mobile-item__meta">
                    <strong>Cohort:</strong> {row.cohort_name || `#${row.cohort_id}`}
                  </p>
                  <p className="info-text application-mobile-item__meta">
                    <strong>Submitted:</strong> {formatDateTime(row.submitted_at)}
                  </p>
                  <div className="application-mobile-item__status">
                    <Badge tone={row.status}>{row.status}</Badge>
                  </div>
                  <div className="application-mobile-item__status">
                    {decisionBucket[row.id]?.action === "approve" ? (
                      <Badge tone="approved">accepted group</Badge>
                    ) : decisionBucket[row.id]?.action === "reject" ? (
                      <Badge tone="rejected">rejected group</Badge>
                    ) : (
                      <span className="info-text info-text--small">Not grouped</span>
                    )}
                  </div>
                  <div className="table-actions application-mobile-item__actions">
                    <button
                      className={`btn btn--sm dh-btn ${decisionBucket[row.id]?.action === "approve" ? "btn--primary" : "btn--secondary"}`}
                      type="button"
                      onClick={() => setRowDecision(row, "approve")}
                      disabled={row.status !== "pending" || isActionLoading}
                    >
                      Accept
                    </button>
                    <button
                      className={`btn btn--sm dh-btn ${decisionBucket[row.id]?.action === "reject" ? "btn--danger" : "btn--secondary"}`}
                      type="button"
                      onClick={() => setRowDecision(row, "reject")}
                      disabled={row.status !== "pending" || isActionLoading}
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
        <div className="modal-overlay applications-modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div
            className="modal-card applications-modal-card applications-modal-card--details"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setSelected(null)}>X</button>
              <h3 className="modal-title">Application Details</h3>
            </header>

            <div className="post-details applications-details-grid">
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
                <strong>Review Message:</strong> {selected.review_message || "N/A"}
              </p>
              <p className="post-details__line">
                <strong>Applicant ID:</strong> {selected.applicant_id ?? "N/A"}
              </p>
            </div>

            <div className="post-details application-json-block">
              <p className="post-details__line">
                <strong>Submission Answers</strong>
              </p>
              {selectedAnswerEntries.length ? (
                <div className="applications-answers-list">
                  {selectedAnswerEntries.map((entry, index) => (
                    <div className="applications-answers-item" key={`${entry.key}-${index}`}>
                      <p className="applications-answers-item__key">{entry.key}</p>
                      <p className="applications-answers-item__value">{entry.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="post-details__line">No submission answers available from this endpoint.</p>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => setRowDecision(selected, "approve")}
                disabled={selected.status !== "pending"}
              >
                Add To Accepted Group
              </button>
              <button
                className="btn btn--danger"
                type="button"
                onClick={() => setRowDecision(selected, "reject")}
                disabled={selected.status !== "pending"}
              >
                Add To Rejected Group
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reviewModal ? (
        <div className="modal-overlay applications-modal-overlay" role="presentation" onClick={() => setReviewModal(null)}>
          <div
            className="modal-card modal-card--narrow applications-modal-card applications-modal-card--review"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <button className="modal-close" type="button" onClick={() => setApproveTarget(null)}>X</button>
              <h3 className="modal-title">Approve Application</h3>
            </header>
            <p className="post-details__line">
              Send {reviewModal.action === "approve" ? "acceptance" : "rejection"} message for{" "}
              <strong>{reviewModal.targets.length === 1 ? (reviewModal.targets[0].full_name || "this applicant") : `${reviewModal.targets.length} grouped applications`}</strong>
              {reviewModal.targets.length === 1 ? (
                <>
                  {" "}for <strong>{reviewModal.targets[0].cohort_name || `#${reviewModal.targets[0].cohort_id}`}</strong>
                </>
              ) : null}
              ?
            </p>
            <div className="applications-send-channels">
              <label className="field cohort-form-switch applications-send-channels__item">
                <span className="field__label">Send Email</span>
                <input
                  className="cohort-form-switch__checkbox"
                  type="checkbox"
                  checked={sendByEmail}
                  onChange={(event) => setSendByEmail(event.target.checked)}
                />
              </label>
              <label className="field cohort-form-switch applications-send-channels__item">
                <span className="field__label">Send Phone</span>
                <input
                  className="cohort-form-switch__checkbox"
                  type="checkbox"
                  checked={sendByPhone}
                  onChange={(event) => setSendByPhone(event.target.checked)}
                />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Message To Group (optional)</span>
              <textarea
                className="textarea-control"
                value={reviewMessage}
                onChange={(event) => setReviewMessage(event.target.value)}
                placeholder={reviewModal.action === "approve" ? "Optional acceptance message." : "Optional rejection message."}
              />
            </label>
            <div className="modal-actions">
              <button
                className="btn btn--secondary"
                type="button"
                onClick={() => setReviewModal(null)}
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button
                className={`btn ${reviewModal.action === "approve" ? "btn--primary" : "btn--danger"}`}
                type="button"
                onClick={submitReviewAction}
                disabled={isActionLoading}
              >
                {isActionLoading
                  ? reviewModal.action === "approve"
                    ? "Sending Accepted Group..."
                    : "Sending Rejected Group..."
                  : reviewModal.action === "approve"
                    ? "Send Accepted Group"
                    : "Send Rejected Group"}
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
