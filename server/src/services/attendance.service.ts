// File Summary: server/src/services/attendance.service.ts
// Layer: services
// Purpose: Attendance business logic for cohort daily sessions and student records.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import {
  deleteAttendanceRecordsNotInStudentList,
  getAttendanceSessionByCohortDate,
  getCohortForAttendance,
  listAttendanceRecordsBySession,
  listCohortStudentsForAttendance,
  listRunningCohortsForAttendance,
  listStudentAttendanceHistory,
  upsertAttendanceRecord,
  upsertAttendanceSession,
} from "../repositories/attendance.repo.js";

const DEFAULT_ATTENDANCE_DAYS = ["monday", "tuesday", "wednesday", "thursday"];

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAttendanceDays(value) {
  if (!Array.isArray(value)) return DEFAULT_ATTENDANCE_DAYS;
  const normalized = value
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  return normalized.length ? [...new Set(normalized)] : DEFAULT_ATTENDANCE_DAYS;
}

function toTimeValue(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const hhmm = text.match(/^(\d{2}:\d{2})/);
  return hhmm ? hhmm[1] : null;
}

function toCohortAttendanceMeta(row) {
  return {
    id: row.id,
    name: row.name,
    program_id: row.program_id,
    program_title: row.program_title,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    attendance_days: normalizeAttendanceDays(row.attendance_days),
    attendance_start_time: toTimeValue(row.attendance_start_time),
    attendance_end_time: toTimeValue(row.attendance_end_time),
  };
}

function mapStudentAttendanceRow(row) {
  return {
    student_user_id: Number(row.student_user_id),
    full_name: String(row.full_name || "").trim() || "Student",
    email: row.email ?? null,
    phone: row.phone ?? null,
    enrollment_status: row.enrollment_status ?? null,
  };
}

export async function listRunningAttendanceCohortsService() {
  const result = await listRunningCohortsForAttendance();
  return {
    cohorts: result.rows.map(toCohortAttendanceMeta),
  };
}

export async function getAttendanceSheetService(query) {
  const cohortId = Number(query.cohort_id);
  const attendanceDate = String(query.date || getTodayIsoDate());

  const cohortResult = await getCohortForAttendance(cohortId);
  if (!cohortResult.rowCount) {
    throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
  }

  const [studentsResult, sessionResult] = await Promise.all([
    listCohortStudentsForAttendance(cohortId),
    getAttendanceSessionByCohortDate(cohortId, attendanceDate),
  ]);

  const students = (studentsResult.rows || []).map(mapStudentAttendanceRow);
  const cohort = toCohortAttendanceMeta(cohortResult.rows[0]);
  const session = sessionResult.rows[0] ?? null;

  let recordMap = new Map();
  if (session?.id) {
    const recordResult = await listAttendanceRecordsBySession(session.id);
    recordMap = new Map(
      (recordResult.rows || []).map((entry) => [
        Number(entry.student_user_id),
        {
          status: entry.attendance_status,
          note: entry.note ?? null,
        },
      ]),
    );
  }

  return {
    cohort,
    session: {
      id: session?.id ?? null,
      attendance_date: attendanceDate,
      location_type: session?.location_type || "on_site",
      submitted_at: session?.submitted_at ?? null,
      submitted_by: session?.submitted_by ?? null,
    },
    students: students.map((entry) => {
      const existing = recordMap.get(entry.student_user_id);
      return {
        ...entry,
        attendance_status: existing?.status || "present",
        note: existing?.note || "",
      };
    }),
  };
}

export async function saveAttendanceSheetService(actorUserId, payload) {
  return withTransaction(async (client) => {
    const cohortId = Number(payload.cohort_id);
    const attendanceDate = String(payload.attendance_date || "").trim();
    const locationType = payload.location_type === "remote" ? "remote" : "on_site";

    const cohortResult = await getCohortForAttendance(cohortId, client);
    if (!cohortResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    const studentsResult = await listCohortStudentsForAttendance(cohortId, client);
    const validStudentIds = new Set((studentsResult.rows || []).map((entry) => Number(entry.student_user_id)));
    if (!validStudentIds.size) {
      throw new AppError(400, "VALIDATION_ERROR", "No enrolled students were found for this cohort.");
    }

    const dedup = new Map();
    for (const item of payload.records || []) {
      const studentUserId = Number(item.student_user_id);
      if (!validStudentIds.has(studentUserId)) {
        throw new AppError(400, "VALIDATION_ERROR", `Student ${studentUserId} is not enrolled in this cohort.`);
      }
      dedup.set(studentUserId, {
        student_user_id: studentUserId,
        attendance_status: item.status,
        note: String(item.note || "").trim() || null,
      });
    }

    const records = [...dedup.values()];
    if (!records.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Attendance records are required.");
    }

    const sessionResult = await upsertAttendanceSession(
      {
        cohort_id: cohortId,
        attendance_date: attendanceDate,
        location_type: locationType,
        submitted_by: actorUserId,
      },
      client,
    );
    const session = sessionResult.rows[0];

    const presentAbsentLate = { present: 0, absent: 0, late: 0 };
    for (const record of records) {
      await upsertAttendanceRecord(
        {
          session_id: session.id,
          student_user_id: record.student_user_id,
          attendance_status: record.attendance_status,
          note: record.note,
          marked_by: actorUserId,
        },
        client,
      );
      if (record.attendance_status === "absent") presentAbsentLate.absent += 1;
      else if (record.attendance_status === "late") presentAbsentLate.late += 1;
      else presentAbsentLate.present += 1;
    }

    await deleteAttendanceRecordsNotInStudentList(
      session.id,
      records.map((entry) => entry.student_user_id),
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: "record attendance",
        entityType: "attendance_sessions",
        entityId: session.id,
        message: `Attendance saved for cohort ${cohortId} on ${attendanceDate}.`,
        metadata: {
          cohort_id: cohortId,
          attendance_date: attendanceDate,
          location_type: locationType,
          totals: presentAbsentLate,
        },
        title: "Attendance Saved",
        body: `Attendance sheet saved for cohort #${cohortId}.`,
      },
      client,
    );

    return {
      session: {
        id: session.id,
        cohort_id: cohortId,
        attendance_date: attendanceDate,
        location_type: locationType,
        submitted_at: session.submitted_at,
        submitted_by: session.submitted_by,
      },
      totals: presentAbsentLate,
      records_count: records.length,
    };
  });
}

export async function getStudentAttendanceService(userId, query) {
  const limitRaw = Number(query.limit ?? 30);
  const limit = Number.isFinite(limitRaw) ? Math.min(120, Math.max(1, limitRaw)) : 30;
  const result = await listStudentAttendanceHistory(userId, limit);
  const entries = (result.rows || []).map((row) => ({
    id: row.id,
    session_id: row.session_id,
    attendance_date: row.attendance_date,
    location_type: row.location_type,
    attendance_status: row.attendance_status,
    note: row.note ?? null,
    marked_at: row.marked_at,
    cohort_id: row.cohort_id,
    cohort_name: row.cohort_name ?? null,
    program_id: row.program_id,
    program_title: row.program_title ?? null,
  }));

  const summary = entries.reduce(
    (acc, entry) => {
      if (entry.attendance_status === "absent") acc.absent += 1;
      else if (entry.attendance_status === "late") acc.late += 1;
      else acc.present += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );

  return {
    student_user_id: userId,
    summary: {
      ...summary,
      total: entries.length,
    },
    entries,
  };
}
