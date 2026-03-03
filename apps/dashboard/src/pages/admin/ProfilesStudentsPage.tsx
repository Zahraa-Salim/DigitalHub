import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { CsvExportModal, type CsvExportColumn } from "../../components/CsvExportModal";
import { FilterBar } from "../../components/FilterBar";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { Table } from "../../components/Table";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
import { ApiError, api, apiList, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";

type StudentCohort = {
  enrollment_id: number;
  cohort_id: number | null;
  cohort_name: string | null;
  cohort_status: string | null;
  program_id: number | null;
  program_title: string | null;
  enrollment_status: string | null;
  enrolled_at: string | null;
};

type StudentRow = {
  user_id: number;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  is_public: boolean;
  featured: boolean;
  featured_rank: number | null;
  public_slug: string | null;
  is_graduated: boolean;
  is_working: boolean;
  open_to_work: boolean;
  company_work_for: string | null;
  admin_status: "active" | "dropout" | null;
  dropout_reason: string | null;
  status_updated_at: string | null;
  status_updated_by: number | null;
  created_at: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  cohorts: StudentCohort[] | null;
};

type CohortOption = {
  id: number;
  name: string;
};

type StudentStatus = "active" | "dropout";

const defaultPagination: PaginationMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };

type StudentAttendanceEntry = {
  id: number;
  session_id: number;
  attendance_date: string;
  location_type: "remote" | "on_site";
  attendance_status: "present" | "absent" | "late";
  note: string | null;
  marked_at: string | null;
  cohort_id: number | null;
  cohort_name: string | null;
  program_id: number | null;
  program_title: string | null;
};

type StudentAttendanceResponse = {
  student_user_id: number;
  summary: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  entries: StudentAttendanceEntry[];
};

function asText(value: string | null | undefined): string {
  return String(value ?? "").trim() || "Not set";
}

function getStudentStatus(row: Pick<StudentRow, "admin_status" | "is_active">): StudentStatus {
  const status = String(row.admin_status || "").trim().toLowerCase();
  if (status === "dropout") return "dropout";
  if (status === "active") return "active";
  return row.is_active ? "active" : "dropout";
}

function summarizeCohorts(cohorts: StudentCohort[] | null | undefined): string {
  if (!Array.isArray(cohorts) || cohorts.length === 0) {
    return "No cohort assigned";
  }
  const labels = cohorts
    .map((entry) => {
      const program = String(entry.program_title || "").trim();
      const cohort = String(entry.cohort_name || "").trim();
      if (program && cohort) return `${program} - ${cohort}`;
      if (cohort) return cohort;
      if (program) return program;
      return "Assigned cohort";
    })
    .filter((value) => value.length > 0);
  if (!labels.length) return "No cohort assigned";
  if (labels.length <= 2) return labels.join(" | ");
  return `${labels.slice(0, 2).join(" | ")} +${labels.length - 2} more`;
}

export function ProfilesStudentsPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StudentStatus>("all");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">("all");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(false);

  const [sortBy, setSortBy] = useState<"created_at" | "full_name" | "status">("created_at");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [csvExportOpen, setCsvExportOpen] = useState(false);

  const [details, setDetails] = useState<StudentRow | null>(null);
  const [detailsAttendance, setDetailsAttendance] = useState<StudentAttendanceResponse | null>(null);
  const [loadingDetailsAttendance, setLoadingDetailsAttendance] = useState(false);
  const [detailsAttendanceError, setDetailsAttendanceError] = useState("");
  const [statusTarget, setStatusTarget] = useState<StudentRow | null>(null);
  const [statusNext, setStatusNext] = useState<StudentStatus>("dropout");
  const [dropoutReason, setDropoutReason] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const [messageTargets, setMessageTargets] = useState<StudentRow[]>([]);
  const [messageChannel, setMessageChannel] = useState<"email" | "sms">("email");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(1);

  const pushToast = useCallback((tone: "success" | "error", message: string) => {
    const id = toastIdRef.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3600);
  }, []);

  const cohortSelectOptions = useMemo(
    () => [
      { label: "All Cohorts", value: "all" },
      ...cohorts.map((item) => ({ label: item.name, value: String(item.id) })),
    ],
    [cohorts],
  );

  const publicCount = useMemo(() => rows.filter((entry) => entry.is_public).length, [rows]);
  const activeCount = useMemo(() => rows.filter((entry) => getStudentStatus(entry) === "active").length, [rows]);
  const dropoutCount = useMemo(() => rows.filter((entry) => getStudentStatus(entry) === "dropout").length, [rows]);
  const totalPagesSafe = Math.max(1, pagination.totalPages);
  const allSelected = rows.length > 0 && rows.every((entry) => selectedIds.has(entry.user_id));
  const selectedRows = useMemo(
    () => rows.filter((entry) => selectedIds.has(entry.user_id)),
    [rows, selectedIds],
  );
  const csvColumns = useMemo<CsvExportColumn<StudentRow>[]>(
    () => [
      { key: "name", label: "Student", getValue: (row) => row.full_name || "" },
      { key: "cohorts", label: "Cohorts", getValue: (row) => summarizeCohorts(row.cohorts) },
      { key: "status", label: "Status", getValue: (row) => getStudentStatus(row) },
      { key: "dropout_reason", label: "Dropout Reason", getValue: (row) => row.dropout_reason || "" },
      { key: "created_at", label: "Created", getValue: (row) => formatDateTime(row.created_at) },
    ],
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, visibility, cohortFilter, sortBy, sortOrder]);

  useEffect(() => {
    let active = true;
    const loadCohorts = async () => {
      setLoadingCohorts(true);
      try {
        const result = await apiList<CohortOption>("/cohorts?limit=200&sortBy=updated_at&order=desc");
        if (!active) return;
        setCohorts(result.data);
      } catch {
        if (!active) return;
        setCohorts([]);
      } finally {
        if (active) setLoadingCohorts(false);
      }
    };
    void loadCohorts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiList<StudentRow>(
          `/profiles/students${buildQueryString({
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            is_public: visibility === "all" ? undefined : visibility === "public",
            cohort_id: cohortFilter === "all" ? undefined : Number(cohortFilter),
            sortBy,
            order: sortOrder,
          })}`,
        );
        if (!active) return;
        setRows(result.data);
        setPagination(result.pagination);
        setSelectedIds((current) => {
          if (!current.size) return current;
          const next = new Set<number>();
          result.data.forEach((entry) => {
            if (current.has(entry.user_id)) next.add(entry.user_id);
          });
          return next;
        });
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : "Failed to load students.";
        setError(message);
        pushToast("error", message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, statusFilter, visibility, cohortFilter, sortBy, sortOrder, refreshKey, pushToast]);

  useEffect(() => {
    if (!details) {
      setDetailsAttendance(null);
      setDetailsAttendanceError("");
      setLoadingDetailsAttendance(false);
      return;
    }

    let active = true;
    const loadDetailsAttendance = async () => {
      setLoadingDetailsAttendance(true);
      setDetailsAttendanceError("");
      try {
        const result = await api<StudentAttendanceResponse>(`/attendance/students/${details.user_id}?limit=50`);
        if (!active) return;
        setDetailsAttendance(result);
      } catch (err) {
        if (!active) return;
        setDetailsAttendance(null);
        setDetailsAttendanceError(err instanceof ApiError ? err.message : "Failed to load attendance history.");
      } finally {
        if (active) setLoadingDetailsAttendance(false);
      }
    };

    void loadDetailsAttendance();
    return () => {
      active = false;
    };
  }, [details]);

  const openStatusModal = (target: StudentRow, nextStatus: StudentStatus) => {
    setStatusTarget(target);
    setStatusNext(nextStatus);
    setDropoutReason(nextStatus === "dropout" ? "" : String(target.dropout_reason || ""));
  };

  const runStatusChange = async () => {
    if (!statusTarget) return;
    const reason = dropoutReason.trim();
    if (statusNext === "dropout" && !reason) {
      pushToast("error", "Please provide the dropout reason.");
      return;
    }

    setSavingStatus(true);
    try {
      await api(`/profiles/students/${statusTarget.user_id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: statusNext,
          reason: statusNext === "dropout" ? reason : undefined,
        }),
      });
      pushToast("success", `Student status updated to ${statusNext}.`);
      setStatusTarget(null);
      setDropoutReason("");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to update student status.");
    } finally {
      setSavingStatus(false);
    }
  };

  const openMessageModal = (targets: StudentRow[]) => {
    if (!targets.length) {
      pushToast("error", "Select at least one student first.");
      return;
    }
    setMessageTargets(targets);
    setMessageChannel("email");
    setMessageSubject("Digital Hub Update");
    setMessageBody("");
  };

  const runSendMessage = async () => {
    if (!messageTargets.length) return;
    const body = messageBody.trim();
    if (!body) {
      pushToast("error", "Message body is required.");
      return;
    }
    const subject = messageSubject.trim();
    if (messageChannel === "email" && !subject) {
      pushToast("error", "Email subject is required.");
      return;
    }

    setSendingMessage(true);
    try {
      const result = await api<{
        sent_count: number;
        skipped_count: number;
        failed_count: number;
      }>("/auth/users/messages", {
        method: "POST",
        body: JSON.stringify({
          channel: messageChannel,
          user_ids: messageTargets.map((entry) => entry.user_id),
          subject: messageChannel === "email" ? subject : undefined,
          body,
        }),
      });
      if (result.sent_count > 0) {
        pushToast("success", `Message sent to ${result.sent_count} student${result.sent_count === 1 ? "" : "s"}.`);
      }
      if (result.skipped_count > 0 || result.failed_count > 0) {
        pushToast(
          "error",
          `Message partially delivered. Skipped: ${result.skipped_count}, Failed: ${result.failed_count}.`,
        );
      }
      setMessageTargets([]);
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <PageShell
      title="Students"
      subtitle="View student profiles, send messages, and manage student status."
    >
      <Card className="instructors-hero">
        <div>
          <h3 className="section-title">Student Profiles Hub</h3>
          <p className="info-text">Profiles are view-only. Only status can be changed.</p>
        </div>
        <div className="profile-badges">
          <Badge tone="resolved">{`${activeCount} active`}</Badge>
          <Badge tone="draft">{`${dropoutCount} dropout`}</Badge>
          <Badge tone="public">{`${publicCount} public`}</Badge>
          <Badge tone="default">{`${pagination.total} total`}</Badge>
        </div>
      </Card>

      <FilterBar
        className="dh-form-grid dh-form-grid--compact filters-grid--students-one-line"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search student name"
        selects={[
          {
            label: "Status",
            value: statusFilter,
            options: [
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Dropped", value: "dropout" },
            ],
            onChange: (value) => setStatusFilter(value as "all" | StudentStatus),
          },
          {
            label: "Visibility",
            value: visibility,
            options: [
              { label: "All", value: "all" },
              { label: "Public", value: "public" },
              { label: "Private", value: "private" },
            ],
            onChange: (value) => setVisibility(value as "all" | "public" | "private"),
          },
          {
            label: loadingCohorts ? "Cohort (loading...)" : "Cohort",
            value: cohortFilter,
            options: cohortSelectOptions,
            onChange: setCohortFilter,
          },
          {
            label: "Sort By",
            value: sortBy,
            options: [
              { label: "Newest", value: "created_at" },
              { label: "Name", value: "full_name" },
              { label: "Status", value: "status" },
            ],
            onChange: (value) => setSortBy(value as "created_at" | "full_name" | "status"),
          },
          {
            label: "Order",
            value: sortOrder,
            options: [
              { label: "Descending", value: "desc" },
              { label: "Ascending", value: "asc" },
            ],
            onChange: (value) => setSortOrder(value as "asc" | "desc"),
          },
        ]}
      />

      {selectedRows.length ? (
        <Card className="admx-bulkbar">
          <div className="admx-bulkbar__left">
            <p>{selectedRows.length} student{selectedRows.length === 1 ? "" : "s"} selected</p>
            <button className="admx-bulkbar__clear" type="button" aria-label="Clear selected students" onClick={() => setSelectedIds(new Set())}>×</button>
          </div>
          <div className="admx-bulkbar__actions">
            <button className="admx-bulkbar__message" type="button" onClick={() => openMessageModal(selectedRows)}>
              Message
            </button>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setCsvExportOpen(true)}>
              Export CSV
            </button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <p className="alert alert--error">{error}</p>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <div className="spinner">Loading students...</div>
        </Card>
      ) : (
        <>
          <Card className="card--table dh-table-wrap profiles-students-table-card">
            <Table<StudentRow>
              rows={rows}
              rowKey={(row) => row.user_id}
              emptyMessage="No students found."
              columns={[
                {
                  key: "select",
                  label: (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() =>
                        setSelectedIds((current) => {
                          if (allSelected) {
                            const next = new Set(current);
                            rows.forEach((entry) => next.delete(entry.user_id));
                            return next;
                          }
                          const next = new Set(current);
                          rows.forEach((entry) => next.add(entry.user_id));
                          return next;
                        })
                      }
                    />
                  ),
                  render: (row) => (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.user_id)}
                      onChange={() =>
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (next.has(row.user_id)) next.delete(row.user_id);
                          else next.add(row.user_id);
                          return next;
                        })
                      }
                    />
                  ),
                },
                {
                  key: "name",
                  label: "Student",
                  className: "table-cell-strong",
                  render: (row) => (
                    <button className="program-title-btn" type="button" onClick={() => setDetails(row)}>
                      {row.full_name?.trim() || "Unnamed student"}
                    </button>
                  ),
                },
                {
                  key: "cohorts",
                  label: "Cohorts",
                  render: (row) => summarizeCohorts(row.cohorts),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => {
                    const status = getStudentStatus(row);
                    return <Badge tone={status === "active" ? "resolved" : "draft"}>{status}</Badge>;
                  },
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => {
                    const status = getStudentStatus(row);
                    return (
                      <div className="table-actions">
                        <button className="btn btn--secondary btn--sm" type="button" onClick={() => setDetails(row)}>
                          View
                        </button>
                        <button className="btn btn--primary btn--sm" type="button" onClick={() => openMessageModal([row])}>
                          Message
                        </button>
                        {status === "active" ? (
                          <button className="btn btn--danger btn--sm" type="button" onClick={() => openStatusModal(row, "dropout")}>
                            Set Dropout
                          </button>
                        ) : (
                          <button className="btn btn--success btn--sm" type="button" onClick={() => openStatusModal(row, "active")}>
                            Set Active
                          </button>
                        )}
                      </div>
                    );
                  },
                },
              ]}
            />
          </Card>

          {pagination.total > 0 ? (
            <Card>
              <Pagination page={pagination.page} totalPages={totalPagesSafe} onChange={setPage} />
            </Card>
          ) : null}
        </>
      )}

      {details ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={() => setDetails(null)}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Student Details</h3>
            </header>
            <div className="post-details">
              <p className="post-details__line"><strong>Name:</strong> {asText(details.full_name)}</p>
              <p className="post-details__line"><strong>Email:</strong> {asText(details.email)}</p>
              <p className="post-details__line"><strong>Phone:</strong> {asText(details.phone)}</p>
              <p className="post-details__line"><strong>Status:</strong> {getStudentStatus(details)}</p>
              {getStudentStatus(details) === "dropout" ? (
                <p className="post-details__line"><strong>Dropout Reason:</strong> {asText(details.dropout_reason)}</p>
              ) : null}
              <p className="post-details__line"><strong>Visibility:</strong> {details.is_public ? "Public" : "Private"}</p>
              <p className="post-details__line"><strong>Featured:</strong> {details.featured ? "Yes" : "No"}</p>
              <p className="post-details__line"><strong>Bio:</strong> {asText(details.bio)}</p>
              <p className="post-details__line"><strong>LinkedIn:</strong> {asText(details.linkedin_url)}</p>
              <p className="post-details__line"><strong>GitHub:</strong> {asText(details.github_url)}</p>
              <p className="post-details__line"><strong>Portfolio:</strong> {asText(details.portfolio_url)}</p>
              <p className="post-details__line"><strong>Created:</strong> {formatDateTime(details.created_at)}</p>
              <p className="post-details__line"><strong>Status Updated:</strong> {details.status_updated_at ? formatDateTime(details.status_updated_at) : "Not set"}</p>
            </div>
            <section className="profile-modal-section">
              <h4 className="section-title">Enrolled Cohorts</h4>
              {Array.isArray(details.cohorts) && details.cohorts.length ? (
                <div className="student-cohort-list">
                  {details.cohorts.map((entry, index) => (
                    <div key={`${entry.enrollment_id}-${index}`} className="student-cohort-item">
                      <p className="student-cohort-item__title">
                        {String(entry.program_title || "").trim() || String(entry.cohort_name || "").trim()
                          ? [entry.program_title, entry.cohort_name].filter((value) => String(value || "").trim().length > 0).join(" - ")
                          : "Assigned cohort"}
                      </p>
                      <p className="student-cohort-item__meta">
                        Cohort Status: {asText(entry.cohort_status)} | Enrollment: {asText(entry.enrollment_status)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="post-details__line">No cohort enrollment records found.</p>
              )}
            </section>
            <section className="profile-modal-section">
              <h4 className="section-title">Attendance History</h4>
              {loadingDetailsAttendance ? <p className="post-details__line">Loading attendance...</p> : null}
              {!loadingDetailsAttendance && detailsAttendanceError ? (
                <p className="post-details__line">{detailsAttendanceError}</p>
              ) : null}
              {!loadingDetailsAttendance && !detailsAttendanceError && detailsAttendance?.summary ? (
                <div className="profile-badges">
                  <Badge tone="resolved">{`${detailsAttendance.summary.present} present`}</Badge>
                  <Badge tone="draft">{`${detailsAttendance.summary.absent} absent`}</Badge>
                  <Badge tone="pending">{`${detailsAttendance.summary.late} late`}</Badge>
                  <Badge tone="default">{`${detailsAttendance.summary.total} total`}</Badge>
                </div>
              ) : null}
              {!loadingDetailsAttendance && !detailsAttendanceError ? (
                Array.isArray(detailsAttendance?.entries) && detailsAttendance.entries.length ? (
                  <div className="student-attendance-list">
                    {detailsAttendance.entries.map((entry) => (
                      <div key={entry.id} className="student-attendance-item">
                        <p className="student-attendance-item__title">
                          {entry.program_title && entry.cohort_name
                            ? `${entry.program_title} - ${entry.cohort_name}`
                            : entry.cohort_name || entry.program_title || "Cohort"}
                        </p>
                        <p className="student-attendance-item__meta">
                          {formatDateTime(entry.attendance_date)} | {entry.location_type === "remote" ? "Remote" : "On Site"}
                        </p>
                        <p className="student-attendance-item__meta">
                          Status: <strong>{entry.attendance_status}</strong>
                          {entry.note ? ` | Note: ${entry.note}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="post-details__line">No attendance records yet.</p>
                )
              ) : null}
            </section>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => openMessageModal([details])}>
                Message
              </button>
              <button className="btn btn--primary" type="button" onClick={() => setDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => !savingStatus && setStatusTarget(null)}>
          <div className="modal-card modal-card--narrow" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">{statusNext === "dropout" ? "Set Student As Dropout" : "Set Student As Active"}</h3>
            </header>
            <p className="post-details__line">
              {statusNext === "dropout" ? "You are marking this student as dropout." : "You are reactivating this student."} Student:
              {" "}
              <strong>{statusTarget.full_name || statusTarget.email || "Selected student"}</strong>
            </p>
            {statusNext === "dropout" ? (
              <label className="field">
                <span className="field__label">Dropout Reason</span>
                <textarea
                  className="textarea-control"
                  value={dropoutReason}
                  onChange={(event) => setDropoutReason(event.target.value)}
                  placeholder="Explain the dropout reason."
                  rows={4}
                />
              </label>
            ) : null}
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setStatusTarget(null)} disabled={savingStatus}>
                Cancel
              </button>
              <button
                className={`btn ${statusNext === "dropout" ? "btn--danger" : "btn--success"}`}
                type="button"
                onClick={() => void runStatusChange()}
                disabled={savingStatus}
              >
                {savingStatus ? "Saving..." : statusNext === "dropout" ? "Confirm Dropout" : "Set Active"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {messageTargets.length ? (
        <div className="modal-overlay" role="presentation" onClick={() => !sendingMessage && setMessageTargets([])}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <h3 className="modal-title">Message Student</h3>
            </header>
            <p className="post-details__line">
              Sending to <strong>{messageTargets.length} student{messageTargets.length === 1 ? "" : "s"}</strong>
            </p>
            <div className="admx-switch">
              <button
                className={messageChannel === "email" ? "admx-switch__btn admx-switch__btn--active" : "admx-switch__btn"}
                type="button"
                onClick={() => setMessageChannel("email")}
              >
                Email
              </button>
              <button
                className={messageChannel === "sms" ? "admx-switch__btn admx-switch__btn--active" : "admx-switch__btn"}
                type="button"
                onClick={() => setMessageChannel("sms")}
              >
                WhatsApp
              </button>
            </div>
            {messageChannel === "email" ? (
              <label className="field">
                <span className="field__label">Subject</span>
                <input className="field__control" value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} />
              </label>
            ) : null}
            <label className="field">
              <span className="field__label">Message</span>
              <textarea
                className="textarea-control"
                rows={7}
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="Write the message to send."
              />
            </label>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setMessageTargets([])} disabled={sendingMessage}>
                Cancel
              </button>
              <button className="btn btn--primary" type="button" onClick={() => void runSendMessage()} disabled={sendingMessage}>
                {sendingMessage ? "Sending..." : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {csvExportOpen ? (
        <CsvExportModal<StudentRow>
          onClose={() => setCsvExportOpen(false)}
          title="Export Students CSV"
          filename={`students-${new Date().toISOString().slice(0, 10)}`}
          columns={csvColumns}
          rowScopes={[
            { id: "visible", label: "Visible Page", rows, default: true },
            { id: "selected", label: "Selected", rows: selectedRows },
          ]}
        />
      ) : null}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </PageShell>
  );
}
