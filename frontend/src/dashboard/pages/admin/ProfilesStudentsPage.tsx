// File: frontend/src/dashboard/pages/admin/ProfilesStudentsPage.tsx
// Purpose: Renders the admin profiles students page page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { CsvExportModal, type CsvExportColumn } from "../../components/CsvExportModal";
import { PageShell } from "../../components/PageShell";
import { Pagination } from "../../components/Pagination";
import { PulseDots } from "../../components/PulseDots";
import { ToastStack } from "../../components/ToastStack";
import { useDashboardToasts } from "../../hooks/useDashboardToasts";
import { ApiError, api, apiList, type PaginationMeta } from "../../utils/api";
import { formatDateTime } from "../../utils/format";
import { buildQueryString } from "../../utils/query";
import { Filters } from "./profiles/shared/Filters";
import { SearchBar } from "./profiles/shared/SearchBar";
import { StatusPanel } from "./profiles/shared/StatusPanel";
import { StudentsTable } from "./profiles/students/StudentsTable";
import { type CohortOption, type StudentRow, type StudentStatus, getStudentStatus, summarizeCohorts } from "./profiles/students/types";

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

type StudentFormState = {
  full_name: string;
  email: string;
  phone: string;
  cohort_id: string; // stored as string for <select>; converted to number on submit
  bio: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  company_work_for: string;
  cv_url: string;
  is_public: boolean;
  is_graduated: boolean;
  is_working: boolean;
  open_to_work: boolean;
};

const initialStudentForm: StudentFormState = {
  full_name: "",
  email: "",
  phone: "",
  cohort_id: "",
  bio: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  company_work_for: "",
  cv_url: "",
  is_public: false,
  is_graduated: false,
  is_working: false,
  open_to_work: false,
};


function rowToEditForm(row: StudentRow): StudentFormState {
  return {
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    cohort_id: "", // not used in edit — cohorts are managed via add/remove below
    bio: row.bio ?? "",
    linkedin_url: row.linkedin_url ?? "",
    github_url: row.github_url ?? "",
    portfolio_url: row.portfolio_url ?? "",
    company_work_for: row.company_work_for ?? "",
    cv_url: row.cv_url ?? "",
    is_public: Boolean(row.is_public),
    is_graduated: Boolean(row.is_graduated),
    is_working: Boolean(row.is_working),
    open_to_work: Boolean(row.open_to_work),
  };
}

export function ProfilesStudentsPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(defaultPagination);
  const [loading, setLoading] = useState(true);
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

  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<StudentFormState>(initialStudentForm);
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState<StudentFormState>(initialStudentForm);
  const [editCurrentCohorts, setEditCurrentCohorts] = useState<StudentRow["cohorts"]>([]);
  const [editAddCohortIds, setEditAddCohortIds] = useState<number[]>([]);
  const [editRemoveCohortIds, setEditRemoveCohortIds] = useState<number[]>([]);
  const [editCohortToAdd, setEditCohortToAdd] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  const publicCount = useMemo(() => rows.filter((entry) => entry.is_public).length, [rows]);
  const activeCount = useMemo(() => rows.filter((entry) => getStudentStatus(entry) === "active").length, [rows]);
  const dropoutCount = useMemo(() => rows.filter((entry) => getStudentStatus(entry) === "dropout").length, [rows]);
  const totalPagesSafe = Math.max(1, pagination.totalPages);
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
      { key: "cv_url", label: "CV URL", getValue: (row: StudentRow) => row.cv_url ?? "" },
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

  const openEditModal = (row: StudentRow) => {
    setEditTarget(row);
    setEditForm(rowToEditForm(row));
    setEditCurrentCohorts(Array.isArray(row.cohorts) ? row.cohorts : []);
    setEditAddCohortIds([]);
    setEditRemoveCohortIds([]);
    setEditCohortToAdd("");
  };

  const toggleRemoveCohort = (cohortId: number) => {
    setEditRemoveCohortIds((current) => (current.includes(cohortId) ? current.filter((id) => id !== cohortId) : [...current, cohortId]));
  };

  const addCohortToEdit = () => {
    const id = Number(editCohortToAdd);
    if (!Number.isInteger(id) || id <= 0) {
      pushToast("error", "Select a cohort to add.");
      return;
    }
    const alreadyEnrolled = (editCurrentCohorts || []).some((entry) => entry.cohort_id === id);
    const alreadyQueued = editAddCohortIds.includes(id);
    if (alreadyEnrolled || alreadyQueued) {
      pushToast("error", "This cohort is already assigned.");
      return;
    }
    setEditAddCohortIds((current) => [...current, id]);
    setEditCohortToAdd("");
  };

  const cancelAddCohort = (cohortId: number) => {
    setEditAddCohortIds((current) => current.filter((id) => id !== cohortId));
  };

  const submitCreate = async () => {
    if (!createForm.full_name.trim()) {
      pushToast("error", "Full name is required.");
      return;
    }
    if (!createForm.email.trim() && !createForm.phone.trim()) {
      pushToast("error", "Email or phone is required.");
      return;
    }
    if (!createForm.cohort_id) {
      pushToast("error", "Please select a cohort before creating the student.");
      return;
    }
    const cohortId = Number(createForm.cohort_id);
    if (!Number.isInteger(cohortId) || cohortId <= 0) {
      pushToast("error", "Please pick a cohort for this student.");
      return;
    }

    setCreating(true);
    try {
      await api("/profiles/students", {
        method: "POST",
        body: JSON.stringify({
          full_name: createForm.full_name.trim(),
          email: createForm.email.trim() || undefined,
          phone: createForm.phone.trim() || undefined,
          cohort_id: cohortId,
          bio: createForm.bio.trim() || undefined,
          linkedin_url: createForm.linkedin_url.trim() || undefined,
          github_url: createForm.github_url.trim() || undefined,
          portfolio_url: createForm.portfolio_url.trim() || undefined,
          company_work_for: createForm.company_work_for.trim() || undefined,
          cv_url: createForm.cv_url.trim() || undefined,
          is_public: createForm.is_public,
          is_graduated: createForm.is_graduated,
          is_working: createForm.is_working,
          open_to_work: createForm.open_to_work,
        }),
      });
      setCreateOpen(false);
      setCreateForm(initialStudentForm);
      setRefreshKey((v) => v + 1);
      pushToast("success", "Student created and enrolled.");
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to create student.");
    } finally {
      setCreating(false);
    }
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    if (!editForm.full_name.trim()) {
      pushToast("error", "Full name is required.");
      return;
    }

    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        bio: editForm.bio.trim(),
        linkedin_url: editForm.linkedin_url.trim(),
        github_url: editForm.github_url.trim(),
        portfolio_url: editForm.portfolio_url.trim(),
        company_work_for: editForm.company_work_for.trim(),
        cv_url: editForm.cv_url.trim(),
        is_public: editForm.is_public,
        is_graduated: editForm.is_graduated,
        is_working: editForm.is_working,
        open_to_work: editForm.open_to_work,
      };
      if (editAddCohortIds.length > 0) body.add_cohort_ids = editAddCohortIds;
      if (editRemoveCohortIds.length > 0) body.remove_cohort_ids = editRemoveCohortIds;

      await api(`/profiles/students/${editTarget.user_id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setEditTarget(null);
      setRefreshKey((v) => v + 1);
      pushToast("success", "Student profile updated.");
    } catch (err) {
      pushToast("error", err instanceof ApiError ? err.message : "Failed to update student.");
    } finally {
      setSavingEdit(false);
    }
  };

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
      subtitle="Add, edit, and manage student profiles, enrollments, and status."
      actions={
        <button className="btn btn--primary dh-btn dh-btn--add" type="button" onClick={() => setCreateOpen(true)}>
          Add Student
        </button>
      }
    >
      <section className="students-layout">
        <StatusPanel
          title="Student Profiles Hub"
          subtitle="Profiles are view-only. Only status can be changed."
          badges={[
            { tone: "public", label: `${publicCount} public` },
            { tone: "resolved", label: `${activeCount} active` },
            { tone: "draft", label: `${dropoutCount} dropout` },
            { tone: "default", label: `${pagination.total} total` },
          ]}
        />

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search student name"
          ariaLabel="Search student name"
        />

        <Filters
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
              options: [
                { label: "All Cohorts", value: "all" },
                ...cohorts.map((cohort) => ({ label: cohort.name, value: String(cohort.id) })),
              ],
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
          <section className="admx-bulkbar">
            <div className="admx-bulkbar__left">
              <p>{selectedRows.length} student{selectedRows.length === 1 ? "" : "s"} selected</p>
              <button
                className="admx-bulkbar__clear"
                type="button"
                aria-label="Clear selected students"
                onClick={() => setSelectedIds(new Set())}
              >
                x
              </button>
            </div>
            <div className="admx-bulkbar__actions">
              <button className="admx-bulkbar__message" type="button" onClick={() => openMessageModal(selectedRows)}>
                Message
              </button>
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => setCsvExportOpen(true)}>
                Export CSV
              </button>
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="admx-empty">
            <PulseDots padding={32} label="Loading" />
          </div>
        ) : (
          <StudentsTable
            rows={rows}
            selectedIds={selectedIds}
            onToggleRow={(id) =>
              setSelectedIds((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onView={setDetails}
            onEdit={openEditModal}
            onMessage={(row) => openMessageModal([row])}
            onSetDropout={(row) => openStatusModal(row, "dropout")}
            onSetActive={(row) => openStatusModal(row, "active")}
          />
        )}

        {!loading && pagination.total > 0 ? (
          <section className="students-pagination">
            <Pagination page={pagination.page} totalPages={totalPagesSafe} onChange={setPage} />
          </section>
        ) : null}
      </section>

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
              <p className="post-details__line">
                <strong>Dropout Reason:</strong> {getStudentStatus(details) === "dropout" ? asText(details.dropout_reason) : "N/A"}
              </p>
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
              <h4 className="section-title">CV / Resume</h4>
              {details.cv_url ? (
                <>
                  <a
                    href={details.cv_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn--sm btn--outline"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    Open CV Link ↗
                  </a>
                  {details.cv_updated_at && (
                    <p style={{ marginTop: 6, color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      Last updated: {formatDateTime(details.cv_updated_at)}
                    </p>
                  )}
                </>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No CV on file.</p>
              )}
            </section>
            <section className="profile-modal-section">
              <h4 className="section-title">Attendance History</h4>
              {loadingDetailsAttendance ? <PulseDots layout="inline" label="Loading attendance" /> : null}
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

      {createOpen ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={() => !creating && setCreateOpen(false)}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">Add Student</h3></header>
            <div className="profile-modal-sections">
              <section className="profile-modal-section">
                <h4 className="section-title">Identity</h4>
                <div className="form-stack">
                  <label className="field"><span className="field__label">Full Name</span><input className="field__control" value={createForm.full_name} onChange={(e) => setCreateForm((c) => ({ ...c, full_name: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Email</span><input className="field__control" type="email" value={createForm.email} onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Phone</span><input className="field__control" value={createForm.phone} onChange={(e) => setCreateForm((c) => ({ ...c, phone: e.target.value }))} /></label>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Cohort Enrollment</h4>
                <div className="form-stack">
                  <label className="field">
                    <span className="field__label">Cohort <span aria-hidden>*</span></span>
                    <select
                      className="field__control"
                      value={createForm.cohort_id}
                      onChange={(e) => setCreateForm((c) => ({ ...c, cohort_id: e.target.value }))}
                      disabled={loadingCohorts}
                    >
                      <option value="">{loadingCohorts ? "Loading cohorts..." : "Select a cohort"}</option>
                      {cohorts.map((cohort) => (
                        <option key={cohort.id} value={String(cohort.id)}>{cohort.name}</option>
                      ))}
                    </select>
                    <small className="field__hint">The student will be enrolled in this cohort on creation.</small>
                  </label>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Profile</h4>
                <div className="form-stack">
                  <label className="field"><span className="field__label">Bio</span><textarea className="textarea-control" value={createForm.bio} onChange={(e) => setCreateForm((c) => ({ ...c, bio: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">LinkedIn URL</span><input className="field__control" type="url" value={createForm.linkedin_url} onChange={(e) => setCreateForm((c) => ({ ...c, linkedin_url: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">GitHub URL</span><input className="field__control" type="url" value={createForm.github_url} onChange={(e) => setCreateForm((c) => ({ ...c, github_url: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Portfolio URL</span><input className="field__control" type="url" value={createForm.portfolio_url} onChange={(e) => setCreateForm((c) => ({ ...c, portfolio_url: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Currently Working At</span><input className="field__control" value={createForm.company_work_for} onChange={(e) => setCreateForm((c) => ({ ...c, company_work_for: e.target.value }))} /></label>
                  <label className="field">
                    <span className="field__label">CV / Resume URL</span>
                    <input
                      className="field__control"
                      type="url"
                      placeholder="https://drive.google.com/file/d/... or any public link"
                      value={createForm.cv_url}
                      onChange={(e) => setCreateForm((c) => ({ ...c, cv_url: e.target.value }))}
                      disabled={creating}
                    />
                    <small className="field__hint">
                      Paste a Google Drive, Dropbox, OneDrive, or direct link. PDF and Word (.docx) links both work.
                    </small>
                  </label>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Flags</h4>
                <div className="form-stack">
                  <label className="cohort-form-switch"><span className="field__label">Public Profile</span><input className="cohort-form-switch__checkbox" type="checkbox" checked={createForm.is_public} onChange={(e) => setCreateForm((c) => ({ ...c, is_public: e.target.checked }))} /></label>
                  <label className="cohort-form-switch"><span className="field__label">Graduated</span><input className="cohort-form-switch__checkbox" type="checkbox" checked={createForm.is_graduated} onChange={(e) => setCreateForm((c) => ({ ...c, is_graduated: e.target.checked }))} /></label>
                  <label className="cohort-form-switch"><span className="field__label">Currently Working</span><input className="cohort-form-switch__checkbox" type="checkbox" checked={createForm.is_working} onChange={(e) => setCreateForm((c) => ({ ...c, is_working: e.target.checked }))} /></label>
                  <label className="cohort-form-switch"><span className="field__label">Open To Work</span><input className="cohort-form-switch__checkbox" type="checkbox" checked={createForm.open_to_work} onChange={(e) => setCreateForm((c) => ({ ...c, open_to_work: e.target.checked }))} /></label>
                </div>
              </section>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={() => void submitCreate()} disabled={creating}>
                {creating ? "Creating..." : "Create Student"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="modal-overlay modal-overlay--profile" role="presentation" onClick={() => !savingEdit && setEditTarget(null)}>
          <div className="modal-card modal-card--profile" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header"><h3 className="modal-title">Edit Student</h3></header>
            <div className="profile-modal-sections">
              <section className="profile-modal-section">
                <h4 className="section-title">Identity</h4>
                <div className="form-stack">
                  <label className="field"><span className="field__label">Full Name</span><input className="field__control" value={editForm.full_name} onChange={(e) => setEditForm((c) => ({ ...c, full_name: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Email</span><input className="field__control" type="email" value={editForm.email} onChange={(e) => setEditForm((c) => ({ ...c, email: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Phone</span><input className="field__control" value={editForm.phone} onChange={(e) => setEditForm((c) => ({ ...c, phone: e.target.value }))} /></label>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Enrollments</h4>
                <div className="form-stack">
                  {editCurrentCohorts && editCurrentCohorts.length ? (
                    <div className="student-cohort-list">
                      {editCurrentCohorts.map((entry, index) => {
                        const cohortId = entry.cohort_id;
                        const isRemoved = cohortId !== null && editRemoveCohortIds.includes(cohortId);
                        return (
                          <div key={`${entry.enrollment_id}-${index}`} className="student-cohort-item">
                            <p className="student-cohort-item__title">
                              {[entry.program_title, entry.cohort_name].filter((value) => String(value || "").trim().length > 0).join(" - ") || "Assigned cohort"}
                            </p>
                            <p className="student-cohort-item__meta">
                              Cohort Status: {asText(entry.cohort_status)} | Enrollment: {asText(entry.enrollment_status)}
                              {isRemoved ? " | Will be removed on save" : ""}
                            </p>
                            {cohortId !== null ? (
                              <button
                                className={`btn btn--sm ${isRemoved ? "btn--secondary" : "btn--danger"}`}
                                type="button"
                                onClick={() => toggleRemoveCohort(cohortId)}
                              >
                                {isRemoved ? "Undo Remove" : "Remove"}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="post-details__line">No current enrollments.</p>
                  )}

                  {editAddCohortIds.length ? (
                    <div className="student-cohort-list">
                      {editAddCohortIds.map((cohortId) => {
                        const cohort = cohorts.find((c) => c.id === cohortId);
                        return (
                          <div key={`pending-add-${cohortId}`} className="student-cohort-item">
                            <p className="student-cohort-item__title">{cohort?.name || `Cohort #${cohortId}`}</p>
                            <p className="student-cohort-item__meta">Will be added on save</p>
                            <button className="btn btn--sm btn--secondary" type="button" onClick={() => cancelAddCohort(cohortId)}>
                              Cancel
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="form-stack" style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                    <label className="field" style={{ flex: 1 }}>
                      <span className="field__label">Add Cohort</span>
                      <select
                        className="field__control"
                        value={editCohortToAdd}
                        onChange={(e) => setEditCohortToAdd(e.target.value)}
                        disabled={loadingCohorts}
                      >
                        <option value="">{loadingCohorts ? "Loading cohorts..." : "Select a cohort"}</option>
                        {cohorts.map((cohort) => (
                          <option key={cohort.id} value={String(cohort.id)}>{cohort.name}</option>
                        ))}
                      </select>
                    </label>
                    <button className="btn btn--primary btn--sm" type="button" onClick={addCohortToEdit} disabled={!editCohortToAdd}>
                      Add
                    </button>
                  </div>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Profile</h4>
                <div className="form-stack">
                  <label className="field"><span className="field__label">Bio</span><textarea className="textarea-control" value={editForm.bio} onChange={(e) => setEditForm((c) => ({ ...c, bio: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">LinkedIn URL</span><input className="field__control" type="url" value={editForm.linkedin_url} onChange={(e) => setEditForm((c) => ({ ...c, linkedin_url: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">GitHub URL</span><input className="field__control" type="url" value={editForm.github_url} onChange={(e) => setEditForm((c) => ({ ...c, github_url: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Portfolio URL</span><input className="field__control" type="url" value={editForm.portfolio_url} onChange={(e) => setEditForm((c) => ({ ...c, portfolio_url: e.target.value }))} /></label>
                  <label className="field"><span className="field__label">Currently Working At</span><input className="field__control" value={editForm.company_work_for} onChange={(e) => setEditForm((c) => ({ ...c, company_work_for: e.target.value }))} /></label>
                  <label className="field">
                    <span className="field__label">CV / Resume URL</span>
                    <input
                      className="field__control"
                      type="url"
                      placeholder="https://drive.google.com/file/d/... or any public link"
                      value={editForm.cv_url}
                      onChange={(e) => setEditForm((c) => ({ ...c, cv_url: e.target.value }))}
                      disabled={savingEdit}
                    />
                    <small className="field__hint">
                      Paste a Google Drive, Dropbox, OneDrive, or direct link. PDF and Word (.docx) links both work. Leave empty to remove.
                    </small>
                  </label>
                </div>
              </section>

              <section className="profile-modal-section">
                <h4 className="section-title">Flags</h4>
                <div className="form-stack">
                  <label className="cohort-form-switch"><span className="field__label">Public Profile</span><input className="cohort-form-switch__checkbox" type="checkbox" checked={editForm.is_public} onChange={(e) => setEditForm((c) => ({ ...c, is_public: e.target.checked }))} /></label>
                  <label className="cohort-form-switch"><span className="field__label">Graduated</span><input className="cohort-form-switch__checkbox" type="checkbox" checked={editForm.is_graduated} onChange={(e) => setEditForm((c) => ({ ...c, is_graduated: e.target.checked }))} /></label>
                  <label className="cohort-form-switch"><span className="field__label">Currently Working</span><input className="cohort-form-switch__checkbox" type="checkbox" checked={editForm.is_working} onChange={(e) => setEditForm((c) => ({ ...c, is_working: e.target.checked }))} /></label>
                  <label className="cohort-form-switch"><span className="field__label">Open To Work</span><input className="cohort-form-switch__checkbox" type="checkbox" checked={editForm.open_to_work} onChange={(e) => setEditForm((c) => ({ ...c, open_to_work: e.target.checked }))} /></label>
                </div>
              </section>
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" type="button" onClick={() => setEditTarget(null)} disabled={savingEdit}>Cancel</button>
              <button className="btn btn--primary" type="button" onClick={() => void submitEdit()} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} exitingIds={exitingIds} onDismiss={dismissToast} />
    </PageShell>
  );
}

