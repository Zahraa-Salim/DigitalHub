// File: frontend/src/dashboard/pages/admin/AttendancePage.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageShell } from "../../components/PageShell";
import { ToastStack, type ToastItem } from "../../components/ToastStack";
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
  totals: {
    present: number;
    absent: number;
    late: number;
  };
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
  if (!Array.isArray(days) || !days.length) return "Mon, Tue, Wed, Thu";
  return days.map((day) => toTitleCase(day.slice(0, 3))).join(", ");
}

function formatHours(startTime: string | null, endTime: string | null): string {
  if (!startTime && !endTime) return "Not set";
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || "Not set";
}

export function AttendancePage() {
  const [cohorts, setCohorts] = useState<AttendanceCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [attendanceDate, setAttendanceDate] = useState<string>(getTodayIso());
  const [locationType, setLocationType] = useState<LocationType>("on_site");

  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [error, setError] = useState("");

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(1);

  const pushToast = useCallback((tone: "success" | "error", message: string) => {
    const id = toastIdRef.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, 3600);
  }, []);

  const selectedCohort = useMemo(
    () => cohorts.find((entry) => String(entry.id) === selectedCohortId) ?? null,
    [cohorts, selectedCohortId],
  );

  const statusCounts = useMemo(
    () =>
      students.reduce(
        (acc, student) => {
          if (student.attendance_status === "absent") acc.absent += 1;
          else if (student.attendance_status === "late") acc.late += 1;
          else acc.present += 1;
          return acc;
        },
        { present: 0, absent: 0, late: 0 },
      ),
    [students],
  );
  const hasSubmittedSession = Boolean(submittedAt);

  useEffect(() => {
    let active = true;

    const loadRunningCohorts = async () => {
      setLoadingCohorts(true);
      setError("");
      try {
        const result = await api<{ cohorts: AttendanceCohort[] }>("/attendance/cohorts/running");
        if (!active) return;
        const next = result.cohorts || [];
        setCohorts(next);
        if (next.length) {
          setSelectedCohortId((current) => current || String(next[0].id));
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : "Failed to load running cohorts.";
        setError(message);
        pushToast("error", message);
      } finally {
        if (active) setLoadingCohorts(false);
      }
    };

    void loadRunningCohorts();
    return () => {
      active = false;
    };
  }, [pushToast]);

  useEffect(() => {
    if (!selectedCohortId) {
      setStudents([]);
      setSubmittedAt(null);
      return;
    }

    let active = true;
    const loadSheet = async () => {
      setLoadingSheet(true);
      setError("");
      try {
        const query = `/attendance/sheet?cohort_id=${encodeURIComponent(selectedCohortId)}&date=${encodeURIComponent(attendanceDate)}`;
        const result = await api<AttendanceSheetResponse>(query);
        if (!active) return;
        setLocationType(result.session.location_type || "on_site");
        setStudents(
          (result.students || []).map((entry) => ({
            ...entry,
            attendance_status: entry.attendance_status || "present",
            note: String(entry.note || ""),
          })),
        );
        setSubmittedAt(result.session.submitted_at);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : "Failed to load attendance sheet.";
        setError(message);
        setStudents([]);
      } finally {
        if (active) setLoadingSheet(false);
      }
    };

    void loadSheet();
    return () => {
      active = false;
    };
  }, [selectedCohortId, attendanceDate]);

  const setStudentStatus = useCallback((studentUserId: number, status: AttendanceStatus) => {
    setStudents((current) =>
      current.map((entry) =>
        entry.student_user_id === studentUserId
          ? { ...entry, attendance_status: status, note: status === "late" ? entry.note : "" }
          : entry,
      ),
    );
  }, []);

  const setStudentNote = useCallback((studentUserId: number, note: string) => {
    setStudents((current) =>
      current.map((entry) =>
        entry.student_user_id === studentUserId ? { ...entry, note } : entry,
      ),
    );
  }, []);

  const setAllStatus = useCallback((status: AttendanceStatus) => {
    setStudents((current) =>
      current.map((entry) => ({
        ...entry,
        attendance_status: status,
        note: status === "late" ? entry.note : "",
      })),
    );
  }, []);

  const saveSheet = useCallback(async () => {
    if (!selectedCohortId) {
      pushToast("error", "Select a running cohort first.");
      return;
    }
    if (!students.length) {
      pushToast("error", "No students found for this cohort.");
      return;
    }

    setSavingSheet(true);
    setError("");
    try {
      const payload = {
        cohort_id: Number(selectedCohortId),
        attendance_date: attendanceDate,
        location_type: locationType,
        records: students.map((entry) => ({
          student_user_id: entry.student_user_id,
          status: entry.attendance_status,
          note: entry.attendance_status === "late" ? entry.note.trim() || undefined : undefined,
        })),
      };
      const result = await api<SaveAttendanceResponse>("/attendance/sheet", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSubmittedAt(result.session.submitted_at || new Date().toISOString());
      pushToast(
        "success",
        `Attendance saved. Present: ${result.totals.present}, Absent: ${result.totals.absent}, Late: ${result.totals.late}.`,
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to save attendance.";
      setError(message);
      pushToast("error", message);
    } finally {
      setSavingSheet(false);
    }
  }, [attendanceDate, locationType, pushToast, selectedCohortId, students]);

  return (
    <PageShell
      title="Attendance"
      subtitle="Take daily attendance per cohort, choose remote/on-site, and update late arrivals anytime."
    >
      <Card className="attendance-page__overview">
        <div>
          <h3 className="section-title">Daily Attendance Sheet</h3>
          <p className="info-text">
            Select the running cohort and date. Students are marked present by default.
          </p>
        </div>
        <div className="profile-badges">
          <Badge tone="resolved">{`${statusCounts.present} present`}</Badge>
          <Badge tone="rejected">{`${statusCounts.absent} absent`}</Badge>
          <Badge tone="pending">{`${statusCounts.late} late`}</Badge>
          <Badge tone="default">{`${students.length} total`}</Badge>
        </div>
      </Card>

      <Card className="attendance-controls">
        <label className="field">
          <span className="field__label">Running Cohort</span>
          <select
            className="field__control"
            value={selectedCohortId}
            onChange={(event) => setSelectedCohortId(event.target.value)}
            disabled={loadingCohorts || !cohorts.length}
          >
            {!cohorts.length ? <option value="">No running cohorts</option> : null}
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={String(cohort.id)}>
                {cohort.program_title ? `${cohort.program_title} - ${cohort.name}` : cohort.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Attendance Date</span>
          <input
            className="field__control"
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Class Type</span>
          <select
            className="field__control"
            value={locationType}
            onChange={(event) => setLocationType(event.target.value as LocationType)}
          >
            <option value="on_site">On Site</option>
            <option value="remote">Remote</option>
          </select>
        </label>

        <div className="attendance-controls__meta">
          <p className="attendance-meta__line">
            <strong>Days:</strong> {formatAttendanceDays(selectedCohort?.attendance_days)}
          </p>
          <p className="attendance-meta__line">
            <strong>Hours:</strong>{" "}
            {formatHours(selectedCohort?.attendance_start_time || null, selectedCohort?.attendance_end_time || null)}
          </p>
          <p className="attendance-meta__line">
            <strong>Last Submitted:</strong> {submittedAt ? new Date(submittedAt).toLocaleString() : "Not submitted yet"}
          </p>
        </div>
      </Card>

      {error ? (
        <Card>
          <p className="alert alert--error">{error}</p>
        </Card>
      ) : null}

      <Card className="attendance-actions">
        <div className="attendance-actions__bulk">
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setAllStatus("present")} disabled={!students.length}>
            Mark All Present
          </button>
          <button className="btn btn--danger btn--sm" type="button" onClick={() => setAllStatus("absent")} disabled={!students.length}>
            Mark All Absent
          </button>
        </div>
        <button className="btn btn--primary" type="button" onClick={() => void saveSheet()} disabled={savingSheet || loadingSheet || !students.length}>
          {savingSheet ? "Saving..." : hasSubmittedSession ? "Update Attendance" : "Submit Attendance"}
        </button>
      </Card>

      <Card className="card--table">
        {loadingSheet ? (
          <div className="spinner">Loading attendance sheet...</div>
        ) : !students.length ? (
          <div className="empty-state">
            <p className="empty-state__title">No students</p>
            <p className="empty-state__description">No enrolled students were found for this cohort on the selected date.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table attendance-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Late Note</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.student_user_id}>
                    <td>
                      <p className="attendance-student__name">{student.full_name || "Student"}</p>
                      <p className="attendance-student__meta">{student.email || student.phone || "No contact"}</p>
                    </td>
                    <td>
                      <div className="attendance-status-toggle" role="group" aria-label={`Attendance status for ${student.full_name}`}>
                        <button
                          className={student.attendance_status === "present" ? "attendance-status-btn attendance-status-btn--present is-active" : "attendance-status-btn attendance-status-btn--present"}
                          type="button"
                          onClick={() => setStudentStatus(student.student_user_id, "present")}
                        >
                          Present
                        </button>
                        <button
                          className={student.attendance_status === "absent" ? "attendance-status-btn attendance-status-btn--absent is-active" : "attendance-status-btn attendance-status-btn--absent"}
                          type="button"
                          onClick={() => setStudentStatus(student.student_user_id, "absent")}
                        >
                          Absent
                        </button>
                        <button
                          className={student.attendance_status === "late" ? "attendance-status-btn attendance-status-btn--late is-active" : "attendance-status-btn attendance-status-btn--late"}
                          type="button"
                          onClick={() => setStudentStatus(student.student_user_id, "late")}
                        >
                          Late
                        </button>
                      </div>
                    </td>
                    <td>
                      {student.attendance_status === "late" ? (
                        <input
                          className="field__control"
                          value={student.note}
                          onChange={(event) => setStudentNote(student.student_user_id, event.target.value)}
                          placeholder="Late reason or arrival time"
                        />
                      ) : (
                        <span className="attendance-note__placeholder">Only used for late students.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />
    </PageShell>
  );
}
