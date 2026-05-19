// File: server/src/routes/import.routes.ts
// Purpose: Handles bulk CSV import for admin users.
// Accepts a table name and array of rows, inserts them, and returns a result summary.

import { Router } from "express";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { pool } from "../db/index.js";
import { verifyAdminAuth } from "../middleware/verifyAdminAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/httpResponse.js";
import { AppError } from "../utils/appError.js";

export const importRouter = Router();

importRouter.use(verifyAdminAuth);

// ── Helpers ───────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v).trim() || null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bool(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase().trim();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

function parseJson(v: unknown): unknown {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

// ── Per-table insert handlers ─────────────────────────────────────────────────

type RowResult = { ok: boolean; error?: string };

async function insertUsers(row: Row, idx: number): Promise<RowResult> {
  const email = str(row.email);
  if (!email) return { ok: false, error: `Row ${idx + 1}: email is required` };

  const role = str(row.role) ?? "student";
  const isStudent = role === "student";
  const isInstructor = role === "instructor";
  const isAdmin = role === "admin" || role === "super_admin";
  const phone = str(row.phone);
  const tempHash = await bcrypt.hash("ChangeMe123!", 10);

  try {
    await pool.query(
      `INSERT INTO users (email, phone, password_hash, is_student, is_instructor, is_admin, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
       ON CONFLICT (email) DO NOTHING`,
      [email, phone, tempHash, isStudent, isInstructor, isAdmin],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function insertStudentProfiles(row: Row, idx: number): Promise<RowResult> {
  const userId = num(row.user_id);
  if (userId === null) return { ok: false, error: `Row ${idx + 1}: user_id is required` };

  const userCheck = await pool.query(
    "SELECT id FROM users WHERE id = $1 AND is_student = TRUE",
    [userId],
  );
  if (!userCheck.rowCount) {
    return { ok: false, error: `Row ${idx + 1}: No student user found with user_id = ${userId}. Create the user first via the Users import.` };
  }

  const cvUrl = str(row.cv_url);
  const cvUpdatedAt = cvUrl ? new Date().toISOString() : null;

  try {
    await pool.query(
      `INSERT INTO student_profiles (
         user_id, full_name, avatar_url, bio, linkedin_url, github_url, portfolio_url,
         public_slug, is_public, featured, featured_rank,
         is_graduated, is_working, open_to_work, company_work_for,
         cv_url, cv_updated_at,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, student_profiles.full_name),
         avatar_url = COALESCE(EXCLUDED.avatar_url, student_profiles.avatar_url),
         bio = COALESCE(EXCLUDED.bio, student_profiles.bio),
         linkedin_url = COALESCE(EXCLUDED.linkedin_url, student_profiles.linkedin_url),
         github_url = COALESCE(EXCLUDED.github_url, student_profiles.github_url),
         portfolio_url = COALESCE(EXCLUDED.portfolio_url, student_profiles.portfolio_url),
         public_slug = COALESCE(EXCLUDED.public_slug, student_profiles.public_slug),
         is_public = COALESCE(EXCLUDED.is_public, student_profiles.is_public),
         featured = COALESCE(EXCLUDED.featured, student_profiles.featured),
         featured_rank = COALESCE(EXCLUDED.featured_rank, student_profiles.featured_rank),
         is_graduated = COALESCE(EXCLUDED.is_graduated, student_profiles.is_graduated),
         is_working = COALESCE(EXCLUDED.is_working, student_profiles.is_working),
         open_to_work = COALESCE(EXCLUDED.open_to_work, student_profiles.open_to_work),
         company_work_for = COALESCE(EXCLUDED.company_work_for, student_profiles.company_work_for),
         cv_url = COALESCE(EXCLUDED.cv_url, student_profiles.cv_url),
         cv_updated_at = CASE
           WHEN EXCLUDED.cv_url IS NOT NULL THEN NOW()
           ELSE student_profiles.cv_updated_at
         END,
         updated_at = NOW()`,
      [
        userId,
        str(row.full_name),
        str(row.avatar_url),
        str(row.bio),
        str(row.linkedin_url),
        str(row.github_url),
        str(row.portfolio_url),
        str(row.public_slug),
        bool(row.is_public) ?? false,
        bool(row.featured) ?? false,
        num(row.featured_rank),
        bool(row.is_graduated) ?? false,
        bool(row.is_working) ?? false,
        bool(row.open_to_work) ?? false,
        str(row.company_work_for),
        cvUrl,
        cvUpdatedAt,
      ],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function insertEnrollments(row: Row, idx: number): Promise<RowResult> {
  const studentUserId = num(row.student_user_id);
  const cohortId = num(row.cohort_id);

  if (studentUserId === null) {
    return { ok: false, error: `Row ${idx + 1}: student_user_id is required and must be a number` };
  }
  if (cohortId === null) {
    return { ok: false, error: `Row ${idx + 1}: cohort_id is required and must be a number` };
  }

  const userCheck = await pool.query(
    "SELECT id FROM users WHERE id = $1 AND is_student = TRUE AND is_active = TRUE",
    [studentUserId],
  );
  if (!userCheck.rowCount) {
    return {
      ok: false,
      error: `Row ${idx + 1}: No active student found with user_id = ${studentUserId}. Check the ID or ensure the user is a student.`,
    };
  }

  const cohortCheck = await pool.query(
    "SELECT id, name FROM cohorts WHERE id = $1 AND deleted_at IS NULL",
    [cohortId],
  );
  if (!cohortCheck.rowCount) {
    return {
      ok: false,
      error: `Row ${idx + 1}: No cohort found with cohort_id = ${cohortId}. Export Cohorts to find valid IDs.`,
    };
  }

  const allowedStatuses = ["active", "paused", "completed", "dropped"];
  const status = str(row.status) ?? "active";
  if (!allowedStatuses.includes(status)) {
    return {
      ok: false,
      error: `Row ${idx + 1}: status must be one of: ${allowedStatuses.join(", ")} — got "${status}"`,
    };
  }

  try {
    await pool.query(
      `INSERT INTO enrollments (student_user_id, cohort_id, status, enrolled_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (student_user_id, cohort_id) DO UPDATE SET
         status = EXCLUDED.status,
         updated_at = NOW()`,
      [studentUserId, cohortId, status],
    );
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function insertInstructorProfiles(row: Row, idx: number): Promise<RowResult> {
  const userId = num(row.user_id);
  if (userId === null) return { ok: false, error: `Row ${idx + 1}: user_id is required` };

  try {
    await pool.query(
      `INSERT INTO instructor_profiles (
         user_id, full_name, avatar_url, bio, expertise, skills,
         linkedin_url, github_url, portfolio_url, is_public, sort_order,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, instructor_profiles.full_name),
         avatar_url = COALESCE(EXCLUDED.avatar_url, instructor_profiles.avatar_url),
         bio = COALESCE(EXCLUDED.bio, instructor_profiles.bio),
         expertise = COALESCE(EXCLUDED.expertise, instructor_profiles.expertise),
         skills = COALESCE(EXCLUDED.skills, instructor_profiles.skills),
         linkedin_url = COALESCE(EXCLUDED.linkedin_url, instructor_profiles.linkedin_url),
         github_url = COALESCE(EXCLUDED.github_url, instructor_profiles.github_url),
         portfolio_url = COALESCE(EXCLUDED.portfolio_url, instructor_profiles.portfolio_url),
         is_public = COALESCE(EXCLUDED.is_public, instructor_profiles.is_public),
         sort_order = COALESCE(EXCLUDED.sort_order, instructor_profiles.sort_order),
         updated_at = NOW()`,
      [
        userId,
        str(row.full_name),
        str(row.avatar_url),
        str(row.bio),
        str(row.expertise),
        str(row.skills),
        str(row.linkedin_url),
        str(row.github_url),
        str(row.portfolio_url),
        bool(row.is_public) ?? false,
        num(row.sort_order),
      ],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function insertPrograms(row: Row, idx: number): Promise<RowResult> {
  const title = str(row.title);
  const slug = str(row.slug);
  if (!title) return { ok: false, error: `Row ${idx + 1}: title is required` };
  if (!slug) return { ok: false, error: `Row ${idx + 1}: slug is required` };

  try {
    await pool.query(
      `INSERT INTO programs (title, slug, description, summary, image_url, featured, featured_rank, meta_title, meta_description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [title, slug, str(row.description), str(row.summary), str(row.image_url), bool(row.featured) ?? false, num(row.featured_rank), str(row.meta_title), str(row.meta_description)],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function insertCohorts(row: Row, idx: number): Promise<RowResult> {
  const programId = num(row.program_id);
  const name = str(row.name);
  if (programId === null) return { ok: false, error: `Row ${idx + 1}: program_id is required` };
  if (!name) return { ok: false, error: `Row ${idx + 1}: name is required` };

  const status = str(row.status) ?? "coming_soon";

  try {
    await pool.query(
      `INSERT INTO cohorts (program_id, name, status, capacity, start_date, end_date, enrollment_open_at, enrollment_close_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [programId, name, status, num(row.capacity), str(row.start_date) ?? null, str(row.end_date) ?? null, str(row.enrollment_open_at) ?? null, str(row.enrollment_close_at) ?? null],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function insertApplicants(row: Row, idx: number): Promise<RowResult> {
  const email = str(row.email);
  const fullName = str(row.full_name);
  if (!email) return { ok: false, error: `Row ${idx + 1}: email is required` };
  if (!fullName) return { ok: false, error: `Row ${idx + 1}: full_name is required` };

  try {
    await pool.query(
      `INSERT INTO applicants (email, full_name, phone, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO NOTHING`,
      [email, fullName, str(row.phone)],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function insertApplications(row: Row, idx: number): Promise<RowResult> {
  const applicantId = num(row.applicant_id);
  const cohortId = num(row.cohort_id);
  if (applicantId === null) return { ok: false, error: `Row ${idx + 1}: applicant_id is required` };
  if (cohortId === null) return { ok: false, error: `Row ${idx + 1}: cohort_id is required` };

  const stage = str(row.stage) ?? "applied";

  try {
    await pool.query(
      `INSERT INTO applications (applicant_id, cohort_id, stage, status, review_message, submission_answers, submitted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $3, $4, '{}'::jsonb, NOW(), NOW(), NOW())`,
      [applicantId, cohortId, stage, str(row.review_message)],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function insertEvents(row: Row, idx: number): Promise<RowResult> {
  const title = str(row.title);
  const slug = str(row.slug);
  const startsAt = str(row.starts_at);
  if (!title) return { ok: false, error: `Row ${idx + 1}: title is required` };
  if (!slug) return { ok: false, error: `Row ${idx + 1}: slug is required` };
  if (!startsAt) return { ok: false, error: `Row ${idx + 1}: starts_at is required` };

  try {
    await pool.query(
      `INSERT INTO events (title, slug, description, location, starts_at, ends_at, capacity, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [title, slug, str(row.description), str(row.location), startsAt, str(row.ends_at), num(row.capacity)],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function insertAnnouncements(row: Row, idx: number): Promise<RowResult> {
  const title = str(row.title);
  if (!title) return { ok: false, error: `Row ${idx + 1}: title is required` };

  const publishAt = str(row.published_at);
  const isPublished = publishAt !== null;

  try {
    await pool.query(
      `INSERT INTO announcements (title, body, is_published, publish_at, cta_label, cta_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [title, str(row.body), isPublished, publishAt, str(row.cta_label), str(row.cta_url)],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function insertMediaAssets(row: Row, idx: number): Promise<RowResult> {
  const fileName = str(row.file_name);
  const publicUrl = str(row.public_url);
  const mimeType = str(row.mime_type) ?? "application/octet-stream";
  const sizeBytes = num(row.size_bytes) ?? 0;
  if (!fileName) return { ok: false, error: `Row ${idx + 1}: file_name is required` };
  if (!publicUrl) return { ok: false, error: `Row ${idx + 1}: public_url is required` };

  try {
    await pool.query(
      `INSERT INTO media_assets (file_name, public_url, mime_type, size_bytes, storage_path, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $1, $5, NOW(), NOW())
       ON CONFLICT (file_name) DO NOTHING`,
      [fileName, publicUrl, mimeType, sizeBytes, parseJson(row.tags) ?? []],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Row ${idx + 1}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ── Table registry ─────────────────────────────────────────────────────────────

const TABLE_HANDLERS: Record<string, (row: Row, idx: number) => Promise<RowResult>> = {
  users: insertUsers,
  student_profiles: insertStudentProfiles,
  enrollments: insertEnrollments,
  instructor_profiles: insertInstructorProfiles,
  programs: insertPrograms,
  cohorts: insertCohorts,
  applicants: insertApplicants,
  applications: insertApplications,
  events: insertEvents,
  announcements: insertAnnouncements,
  media_assets: insertMediaAssets,
};

// ── Route ──────────────────────────────────────────────────────────────────────

importRouter.post(
  "/import",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, rows } = req.body as { table: unknown; rows: unknown };

    if (typeof table !== "string" || !table) {
      throw new AppError(400, "VALIDATION_ERROR", "table is required and must be a string", undefined);
    }

    if (!Array.isArray(rows)) {
      throw new AppError(400, "VALIDATION_ERROR", "rows must be an array", undefined);
    }

    const handler = TABLE_HANDLERS[table];
    if (!handler) {
      throw new AppError(400, "UNKNOWN_TABLE", `Table "${table}" is not supported for import`, undefined);
    }

    if (rows.length === 0) {
      return sendSuccess(res, { inserted: 0, skipped: 0, errors: [] });
    }

    if (rows.length > 5000) {
      throw new AppError(400, "TOO_MANY_ROWS", "Maximum 5000 rows per import", undefined);
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Row;
      const result = await handler(row, i);
      if (result.ok) {
        inserted++;
      } else if (result.error) {
        errors.push(result.error);
        skipped++;
      } else {
        skipped++;
      }
    }

    return sendSuccess(res, { inserted, skipped, errors });
  }),
);
