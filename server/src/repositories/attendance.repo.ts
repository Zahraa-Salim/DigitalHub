// File: server/src/repositories/attendance.repo.ts
// Purpose: Runs the database queries used for attendance.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type AttendanceSessionInput = {
  cohort_id: number;
  attendance_date: string;
  location_type: string;
  submitted_by: number;
};

type AttendanceRecordInput = {
  session_id: number;
  student_user_id: number;
  attendance_status: string;
  note?: string | null;
  marked_by: number;
};

// Handles 'listRunningCohortsForAttendance' workflow for this module.
export async function listRunningCohortsForAttendance(db: DbClient = pool) {
  return db.query(
    `
      SELECT
        c.id,
        c.name,
        c.program_id,
        p.title AS program_title,
        CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS status,
        c.start_date,
        c.end_date,
        c.attendance_days,
        c.attendance_start_time,
        c.attendance_end_time
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      WHERE c.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND c.status = 'running'
      ORDER BY
        CASE c.status
          WHEN 'running' THEN 0
          ELSE 2
        END,
        c.start_date NULLS LAST,
        c.id DESC
    `,
  );
}

// Handles 'getCohortForAttendance' workflow for this module.
export async function getCohortForAttendance(cohortId: number, db: DbClient = pool) {
  return db.query(
    `
      SELECT
        c.id,
        c.name,
        c.program_id,
        p.title AS program_title,
        CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS status,
        c.start_date,
        c.end_date,
        c.attendance_days,
        c.attendance_start_time,
        c.attendance_end_time
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = $1
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [cohortId],
  );
}

// Handles 'listCohortStudentsForAttendance' workflow for this module.
export async function listCohortStudentsForAttendance(cohortId: number, db: DbClient = pool) {
  return db.query(
    `
      SELECT DISTINCT ON (e.student_user_id)
        e.student_user_id,
        COALESCE(NULLIF(sp.full_name, ''), NULLIF(u.email, ''), CONCAT('Student ', u.id::text)) AS full_name,
        u.email,
        u.phone,
        e.status AS enrollment_status
      FROM enrollments e
      JOIN users u ON u.id = e.student_user_id
      LEFT JOIN student_profiles sp ON sp.user_id = e.student_user_id
      WHERE e.cohort_id = $1
        AND u.is_student = TRUE
        AND u.is_active = TRUE
      ORDER BY e.student_user_id, e.enrolled_at DESC NULLS LAST, e.id DESC
    `,
    [cohortId],
  );
}

// Handles 'getAttendanceSessionByCohortDate' workflow for this module.
export async function getAttendanceSessionByCohortDate(cohortId: number, attendanceDate: string, db: DbClient = pool) {
  return db.query(
    `
      SELECT
        id,
        cohort_id,
        attendance_date,
        location_type,
        submitted_by,
        submitted_at,
        created_at,
        updated_at
      FROM attendance_sessions
      WHERE cohort_id = $1
        AND attendance_date = $2
      LIMIT 1
    `,
    [cohortId, attendanceDate],
  );
}

// Handles 'listAttendanceRecordsBySession' workflow for this module.
export async function listAttendanceRecordsBySession(sessionId: number, db: DbClient = pool) {
  return db.query(
    `
      SELECT
        id,
        session_id,
        student_user_id,
        attendance_status,
        note,
        marked_by,
        marked_at,
        created_at,
        updated_at
      FROM attendance_records
      WHERE session_id = $1
      ORDER BY student_user_id ASC
    `,
    [sessionId],
  );
}

// Handles 'upsertAttendanceSession' workflow for this module.
export async function upsertAttendanceSession(input: AttendanceSessionInput, db: DbClient = pool) {
  return db.query(
    `
      INSERT INTO attendance_sessions
        (cohort_id, attendance_date, location_type, submitted_by, submitted_at, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, NOW(), NOW(), NOW())
      ON CONFLICT (cohort_id, attendance_date)
      DO UPDATE SET
        location_type = EXCLUDED.location_type,
        submitted_by = EXCLUDED.submitted_by,
        submitted_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `,
    [input.cohort_id, input.attendance_date, input.location_type, input.submitted_by],
  );
}

// Handles 'upsertAttendanceRecord' workflow for this module.
export async function upsertAttendanceRecord(input: AttendanceRecordInput, db: DbClient = pool) {
  return db.query(
    `
      INSERT INTO attendance_records
        (session_id, student_user_id, attendance_status, note, marked_by, marked_at, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
      ON CONFLICT (session_id, student_user_id)
      DO UPDATE SET
        attendance_status = EXCLUDED.attendance_status,
        note = EXCLUDED.note,
        marked_by = EXCLUDED.marked_by,
        marked_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `,
    [input.session_id, input.student_user_id, input.attendance_status, input.note ?? null, input.marked_by],
  );
}

// Handles 'deleteAttendanceRecordsNotInStudentList' workflow for this module.
export async function deleteAttendanceRecordsNotInStudentList(sessionId: number, studentIds: number[], db: DbClient = pool) {
  return db.query(
    `
      DELETE FROM attendance_records
      WHERE session_id = $1
        AND NOT (student_user_id = ANY($2::bigint[]))
    `,
    [sessionId, studentIds],
  );
}

// Handles 'listStudentAttendanceHistory' workflow for this module.
export async function listStudentAttendanceHistory(userId: number, limit = 30, db: DbClient = pool) {
  return db.query(
    `
      SELECT
        ar.id,
        ar.student_user_id,
        ar.attendance_status,
        ar.note,
        ar.marked_at,
        s.id AS session_id,
        s.attendance_date,
        s.location_type,
        s.cohort_id,
        c.name AS cohort_name,
        p.id AS program_id,
        p.title AS program_title
      FROM attendance_records ar
      JOIN attendance_sessions s ON s.id = ar.session_id
      LEFT JOIN cohorts c ON c.id = s.cohort_id
      LEFT JOIN programs p ON p.id = c.program_id
      WHERE ar.student_user_id = $1
      ORDER BY s.attendance_date DESC, ar.marked_at DESC
      LIMIT $2
    `,
    [userId, limit],
  );
}

