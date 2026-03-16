// File: frontend/src/dashboard/pages/admin/AttendancePage.tsx
// Purpose: Renders the admin attendance page in the dashboard.
// Redesigned: list layout, present/absent toggle, late checkbox.

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "../../components/PageShell";
import { PulseDots } from "../../components/PulseDots";
import { ToastStack } from "../../components/ToastStack";
import { useDashboardToasts } from "../../hooks/useDashboardToasts";
import { ApiError, api } from "../../utils/api";

type AttendanceStatus = "present" | "absent" | "late";
type LocationType = "remote" | "on_site";

type AttendanceCohort = {
  id: number;
  name: string;
  program_id: number;
  program_title: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  attendance_days: string[];
  attendance_start_time: string | null;
  attendance_end_time: string | null;
};

type AttendanceStudent = {
  student_user_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  enrollment_status: string | null;
  attendance_status: AttendanceStatus;
  note: string;
};

type AttendanceSheetResponse = {
  cohort: AttendanceCohort;
  session: {
    id: number | null;
    attendance_date: string;
    location_type: LocationType;
    submitted_at: string | null;
    submitted_by: number | null;
  };
  students: AttendanceStudent[];
};

type SaveAttendanceResponse = {
  session: {
    id: number;
    cohort_id: number;
    attendance_date: string;
    location_type: LocationType;
    submitted_at: string | null;
    submitted_by: number | null;
  };
  totals: { present: number; absent: number; late: number };
  records_count: number;
};

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toTitleCase(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.slice(0, 1).toUpperCase() + text.slice(1);
}

function formatAttendanceDays(days: string[] | null | undefined): string {
  if (!Array.isArray(days) || !days.length) return "Mon – Thu";
  return days.map((d) => toTitleCase(d.slice(0, 3))).join(", ");
}

function formatHours(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  if (start && end) return `${start} – ${end}`;
  return start || end || "—";
}

function formatSubmitted(iso: string | null): string {
  if (!iso) return "Not submitted yet";
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function escapeAttCsv(value: string): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildAttendanceCsv(
  cohortName: string,
  date: string,
  locationType: string,
  students: AttendanceStudent[],
): string {
  const header = ["#", "Name", "Email", "Phone", "Status", "Note"].map(escapeAttCsv).join(",");
  const lines = students.map((s, i) =>
    [
      String(i + 1),
      s.full_name,
      s.email ?? "",
      s.phone ?? "",
      s.attendance_status,
      s.note ?? "",
    ]
      .map(escapeAttCsv)
      .join(","),
  );
  const meta = `# Attendance — ${cohortName} — ${date} — ${locationType === "on_site" ? "On-site" : "Remote"}`;
  return [meta, header, ...lines].join("\r\n");
}

function downloadAttCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Present/Absent toggle switch ─────────────────────────────────────────────
function AttToggle({ isPresent, onChange }: { isPresent: boolean; onChange: (present: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPresent}
      className={`att-toggle${isPresent ? " att-toggle--on" : " att-toggle--off"}`}
      onClick={() => onChange(!isPresent)}
      title={isPresent ? "Mark Absent" : "Mark Present"}
    >
      <span className="att-toggle__thumb" />
    </button>
  );
}

// ── Icons (grey, no color) ───────────────────────────────────────────────────
function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function AttendancePage() {
  const [cohorts, setCohorts] = useState<AttendanceCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [attendanceDate, setAttendanceDate] = useState<string>(getTodayIso());
  const [locationType, setLocationType] = useState<LocationType>("on_site");

  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [hasLoadedSheetOnce, setHasLoadedSheetOnce] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [search, setSearch] = useState("");

  const { toasts, exitingIds, pushToast, dismissToast } = useDashboardToasts();

  const selectedCohort = useMemo(
    () => cohorts.find((c) => String(c.id) === selectedCohortId) ?? null,
    [cohorts, selectedCohortId],
  );

  const statusCounts = useMemo(
    () =>
      students.reduce(
        (acc, s) => { acc[s.attendance_status] += 1; return acc; },
        { present: 0, absent: 0, late: 0 } as Record<AttendanceStatus, number>,
      ),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.full_name.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q),
    );
  }, [students, search]);

  const hasSubmitted = Boolean(submittedAt);
  const presentPct = students.length
    ? Math.round(((statusCounts.present + statusCounts.late) / students.length) * 100)
    : 0;

  useEffect(() => {
    let active = true;
    setLoadingCohorts(true);
    api<{ cohorts: AttendanceCohort[] }>("/attendance/cohorts/running")
      .then((res) => {
        if (!active) return;
        const list = (res.cohorts || []).filter((cohort) => cohort.status === "running");
        setCohorts(list);
        setSelectedCohortId((current) => {
          if (!list.length) return "";
          return list.some((cohort) => String(cohort.id) === current) ? current : String(list[0].id);
        });
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof ApiError ? err.message : "Failed to load cohorts.";
        pushToast("error", msg);
      })
      .finally(() => { if (active) setLoadingCohorts(false); });
    return () => { active = false; };
  }, [pushToast]);

  useEffect(() => {
    if (!selectedCohortId) { setStudents([]); setSubmittedAt(null); return; }
    let active = true;
    setLoadingSheet(true);
    setHasLoadedSheetOnce(false);
    const query = `/attendance/sheet?cohort_id=${encodeURIComponent(selectedCohortId)}&date=${encodeURIComponent(attendanceDate)}`;
    api<AttendanceSheetResponse>(query)
      .then((res) => {
        if (!active) return;
        setLocationType(res.session.location_type || "on_site");
        setStudents(
          (res.students || []).map((s) => ({
            ...s,
            attendance_status: s.attendance_status || "present",
            note: String(s.note || ""),
          })),
        );
        setSubmittedAt(res.session.submitted_at);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof ApiError ? err.message : "Failed to load attendance sheet.";
        pushToast("error", msg);
        setStudents([]);
      })
      .finally(() => {
        if (active) {
          setLoadingSheet(false);
          setHasLoadedSheetOnce(true);
        }
      });
    return () => { active = false; };
  }, [selectedCohortId, attendanceDate]);

  const showInitialSheetLoading =
    loadingCohorts ||
    loadingSheet ||
    (!selectedCohortId && cohorts.length > 0 && !hasLoadedSheetOnce);

  // Toggle present ↔ absent (never affects late directly — that's the checkbox)
  const togglePresence = useCallback((id: number, goPresent: boolean) => {
    setStudents((c) =>
      c.map((s) => {
        if (s.student_user_id !== id) return s;
        if (goPresent) {
          // going present: keep late if already late
          return { ...s, attendance_status: s.attendance_status === "late" ? "late" : "present" };
        } else {
          // going absent: must clear late too
          return { ...s, attendance_status: "absent", note: "" };
        }
      }),
    );
  }, []);

  // Late checkbox:
  //   check  → forces "late" (which counts as present)
  //   uncheck → back to "present"
  //   disabled when absent
  const toggleLate = useCallback((id: number, checked: boolean) => {
    setStudents((c) =>
      c.map((s) => {
        if (s.student_user_id !== id) return s;
        if (checked) return { ...s, attendance_status: "late" };
        return { ...s, attendance_status: "present", note: "" };
      }),
    );
  }, []);

  const setStudentNote = useCallback((id: number, note: string) => {
    setStudents((c) => c.map((s) => (s.student_user_id === id ? { ...s, note } : s)));
  }, []);

  const setAllStatus = useCallback((status: AttendanceStatus) => {
    setStudents((c) =>
      c.map((s) => ({ ...s, attendance_status: status, note: status !== "late" ? "" : s.note })),
    );
  }, []);

  const saveSheet = useCallback(async () => {
    if (!selectedCohortId) { pushToast("error", "Select a cohort first."); return; }
    if (!students.length) { pushToast("error", "No students found."); return; }
    setSavingSheet(true);
    try {
      const payload = {
        cohort_id: Number(selectedCohortId),
        attendance_date: attendanceDate,
        location_type: locationType,
        records: students.map((s) => ({
          student_user_id: s.student_user_id,
          status: s.attendance_status,
          note: s.attendance_status === "late" ? s.note.trim() || undefined : undefined,
        })),
      };
      const result = await api<SaveAttendanceResponse>("/attendance/sheet", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSubmittedAt(result.session.submitted_at || new Date().toISOString());
      pushToast(
        "success",
        `Saved — ${result.totals.present} present · ${result.totals.absent} absent · ${result.totals.late} late`,
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save attendance.";
      pushToast("error", msg);
    } finally {
      setSavingSheet(false);
    }
  }, [attendanceDate, locationType, pushToast, selectedCohortId, students]);

  const exportCurrentSheet = useCallback(() => {
    if (!students.length || !selectedCohort) return;
    const cohortLabel = selectedCohort.program_title
      ? `${selectedCohort.program_title} - ${selectedCohort.name}`
      : selectedCohort.name;
    const csv = buildAttendanceCsv(cohortLabel, attendanceDate, locationType, students);
    const safeName = cohortLabel.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    downloadAttCsv(csv, `attendance_${safeName}_${attendanceDate}`);
  }, [students, selectedCohort, attendanceDate, locationType]);

  return (
    <PageShell title="Attendance" subtitle="Take daily attendance per cohort.">

      {/* ── Controls bar ─────────────────────────────────────── */}
      <div className="att-controls-bar">
        <div className="att-controls-bar__field">
          <label className="att-label" htmlFor="att-cohort">Cohort</label>
          <select
            id="att-cohort"
            className="att-select"
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            disabled={loadingCohorts || !cohorts.length}
          >
            {!cohorts.length
              ? <option value="">No running cohorts</option>
              : cohorts.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.program_title ? `${c.program_title} – ${c.name}` : c.name}
                  </option>
                ))
            }
          </select>
        </div>

        <div className="att-controls-bar__field">
          <label className="att-label" htmlFor="att-date">Date</label>
          <input
            id="att-date"
            className="att-input"
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>

        <div className="att-controls-bar__field">
          <label className="att-label">Class Type</label>
          <div className="att-location-toggle">
            <button
              type="button"
              className={`att-location-toggle__btn${locationType === "on_site" ? " is-active" : ""}`}
              onClick={() => setLocationType("on_site")}
            >
              On-site
            </button>
            <button
              type="button"
              className={`att-location-toggle__btn${locationType === "remote" ? " is-active" : ""}`}
              onClick={() => setLocationType("remote")}
            >
              Remote
            </button>
          </div>
        </div>

        {selectedCohort && (
          <div className="att-controls-bar__meta">
            <span className="att-meta-chip"><CalIcon />{formatAttendanceDays(selectedCohort.attendance_days)}</span>
            <span className="att-meta-chip"><ClockIcon />{formatHours(selectedCohort.attendance_start_time, selectedCohort.attendance_end_time)}</span>
          </div>
        )}
      </div>

      {/* ── Stats row ─────────────────────────────────────────── */}
      {students.length > 0 && (
        <div className="att-stats-row">
          <div className="att-stat att-stat--present">
            <span className="att-stat__num">{statusCounts.present}</span>
            <span className="att-stat__label">Present</span>
          </div>
          <div className="att-stat att-stat--absent">
            <span className="att-stat__num">{statusCounts.absent}</span>
            <span className="att-stat__label">Absent</span>
          </div>
          <div className="att-stat att-stat--late">
            <span className="att-stat__num">{statusCounts.late}</span>
            <span className="att-stat__label">Late</span>
          </div>
          <div className="att-stat att-stat--total">
            <span className="att-stat__num">{students.length}</span>
            <span className="att-stat__label">Total</span>
          </div>

          <div className="att-progress-wrap">
            <div className="att-progress-bar">
              <div
                className="att-progress-bar__fill att-progress-bar__fill--present"
                style={{ width: `${(statusCounts.present / students.length) * 100}%` }}
              />
              <div
                className="att-progress-bar__fill att-progress-bar__fill--late"
                style={{ width: `${(statusCounts.late / students.length) * 100}%` }}
              />
            </div>
            <span className="att-progress-pct">{presentPct}% present</span>
          </div>

          <div className={`att-submitted-badge${hasSubmitted ? " att-submitted-badge--done" : ""}`}>
            {hasSubmitted ? `Submitted ${formatSubmitted(submittedAt)}` : "Not submitted yet"}
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────── */}
      {/* ── Toolbar ──────────────────────────────────────────── */}
      {students.length > 0 && (
        <div className="att-toolbar">
          <div className="att-toolbar__bulk">
            <span className="att-toolbar__label">Mark all:</span>
            <button type="button" className="att-bulk-btn att-bulk-btn--present" onClick={() => setAllStatus("present")}>
              <CheckIcon /> Present
            </button>
            <button type="button" className="att-bulk-btn att-bulk-btn--absent" onClick={() => setAllStatus("absent")}>
              <XIcon /> Absent
            </button>
            <button type="button" className="att-bulk-btn att-bulk-btn--late" onClick={() => setAllStatus("late")}>
              Late
            </button>
          </div>

          <div className="att-toolbar__right">
            <input
              className="att-search"
              type="search"
              placeholder="Search students…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="att-export-btn"
              onClick={exportCurrentSheet}
              disabled={!students.length || loadingSheet}
              title="Export this attendance sheet as CSV"
            >
              Export CSV
            </button>
            <button
              type="button"
              className="att-save-btn"
              onClick={() => void saveSheet()}
              disabled={savingSheet || loadingSheet}
            >
              {savingSheet ? "Saving…" : hasSubmitted ? "Update Attendance" : "Submit Attendance"}
            </button>
          </div>
        </div>
      )}

      {/* ── Student list ──────────────────────────────────────── */}
      <div className="att-sheet">
        {showInitialSheetLoading ? (
          <PulseDots padding={60} label="Loading attendance sheet" />
        ) : !selectedCohortId ? (
          <div className="att-empty">
            <div className="att-empty__icon">📚</div>
            <p className="att-empty__title">No running cohorts available</p>
            <p className="att-empty__sub">Create or start a running cohort to begin taking attendance.</p>
          </div>
        ) : !students.length ? (
          <div className="att-empty">
            <div className="att-empty__icon">📋</div>
            <p className="att-empty__title">No students found</p>
            <p className="att-empty__sub">No enrolled students for this cohort on the selected date.</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="att-empty">
            <div className="att-empty__icon">🔍</div>
            <p className="att-empty__title">No results for "{search}"</p>
          </div>
        ) : (
          <div className="att-list">
            <div className="att-list__header">
              <span className="att-list__col-name">Student</span>
              <span className="att-list__col-late">Late</span>
              <span className="att-list__col-toggle">Absent · Present</span>
            </div>

            {filteredStudents.map((student, index) => {
              const isPresent = student.attendance_status !== "absent";
              const isLate = student.attendance_status === "late";
              const isAbsent = student.attendance_status === "absent";

              return (
                <div
                  key={student.student_user_id}
                  className={[
                    "att-list-row",
                    isAbsent ? "att-list-row--absent" : "",
                    isLate ? "att-list-row--late" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {/* Index + name */}
                  <div className="att-list-row__name">
                    <span className="att-list-row__index">{index + 1}</span>
                    <div className="att-list-row__info">
                      <span className="att-list-row__fullname">{student.full_name || "Student"}</span>
                    </div>
                  </div>

                  {/* Late checkbox + optional note */}
                  <div className="att-list-row__late">
                    <label
                      className={`att-late-check${isAbsent ? " att-late-check--disabled" : ""}`}
                      title={isAbsent ? "Cannot mark late when absent" : "Late"}
                    >
                      <input
                        type="checkbox"
                        checked={isLate}
                        disabled={isAbsent}
                        onChange={(e) => toggleLate(student.student_user_id, e.target.checked)}
                      />
                      <span className="att-late-check__box" />
                    </label>
                    {isLate && (
                      <input
                        className="att-note-input"
                        value={student.note}
                        onChange={(e) => setStudentNote(student.student_user_id, e.target.value)}
                        placeholder="Note…"
                      />
                    )}
                  </div>

                  {/* Toggle switch */}
                  <div className="att-list-row__toggle">
                    <span className={`att-toggle-label${isAbsent ? " att-toggle-label--absent" : ""}`}>
                      Absent
                    </span>
                    <AttToggle
                      isPresent={isPresent}
                      onChange={(present) => togglePresence(student.student_user_id, present)}
                    />
                    <span className={`att-toggle-label${isPresent ? " att-toggle-label--present" : ""}`}>
                      Present
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky bottom bar ─────────────────────────────────── */}
      {students.length > 0 && (
        <div className="att-bottom-bar">
          <p className="att-bottom-bar__summary">
            {statusCounts.present} present · {statusCounts.absent} absent · {statusCounts.late} late
            {hasSubmitted && (
              <span className="att-bottom-bar__submitted"> · Saved {formatSubmitted(submittedAt)}</span>
            )}
          </p>
          <button
            type="button"
            className="att-save-btn"
            onClick={() => void saveSheet()}
            disabled={savingSheet || loadingSheet}
          >
            {savingSheet ? "Saving…" : hasSubmitted ? "Update Attendance" : "Submit Attendance"}
          </button>
        </div>
      )}

      <ToastStack
        toasts={toasts}
        exitingIds={exitingIds}
        onDismiss={dismissToast}
      />
    </PageShell>
  );
}
