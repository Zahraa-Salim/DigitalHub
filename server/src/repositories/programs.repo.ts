// File: server/src/repositories/programs.repo.ts
// Purpose: Runs the database queries used for programs.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type ProgramInput = {
    slug?: string;
    title?: string;
    summary?: string | null;
    description?: string | null;
    requirements?: string | null;
    image_url?: string | null;
    default_capacity?: number | null;
    is_published?: boolean;
    created_by?: number | null;
    [key: string]: unknown;
};

type CohortInput = {
    program_id: number;
    name: string;
    status?: string;
    allow_applications?: boolean;
    capacity?: number | null;
    enrollment_open_at?: string | null;
    enrollment_close_at?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    auto_announce?: boolean;
    attendance_days?: string[] | string | null;
    attendance_start_time?: string | null;
    attendance_end_time?: string | null;
    [key: string]: unknown;
};
// Handles 'createProgram' workflow for this module.
export async function createProgram(input: ProgramInput, db: DbClient = pool) {
    return db.query(`
      INSERT INTO programs
        (slug, title, summary, description, requirements, image_url, default_capacity, is_published, created_by, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
        input.slug,
        input.title,
        input.summary ?? null,
        input.description ?? null,
        input.requirements ?? null,
        input.image_url ?? null,
        input.default_capacity ?? null,
        input.is_published,
        input.created_by,
    ]);
}
// Handles 'countPrograms' workflow for this module.
export async function countPrograms(whereClause: string, params: unknown[], db: DbClient = pool) {
    const scopedWhere = whereClause ? `${whereClause} AND deleted_at IS NULL` : "WHERE deleted_at IS NULL";
    return db.query(`SELECT COUNT(*)::int AS total FROM programs ${scopedWhere}`, params);
}
// Handles 'listPrograms' workflow for this module.
export async function listPrograms(
    whereClause: string,
    sortBy: string,
    order: string,
    params: unknown[],
    limit: number,
    offset: number,
    db: DbClient = pool,
) {
    const scopedWhere = whereClause ? `${whereClause} AND deleted_at IS NULL` : "WHERE deleted_at IS NULL";
    return db.query(`
      SELECT id, slug, title, summary, description, requirements, image_url, default_capacity, is_published, created_by, created_at, updated_at
      FROM programs
      ${scopedWhere}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'updateProgram' workflow for this module.
export async function updateProgram(id: number, setClause: string, values: unknown[], db: DbClient = pool) {
    return db.query(`
      UPDATE programs
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
        AND deleted_at IS NULL
      RETURNING *
    `, [...values, id]);
}
// Handles 'deleteProgram' workflow for this module.
export async function deleteProgram(id: number, db: DbClient = pool) {
    return db.query(`
      UPDATE programs
      SET deleted_at = NOW(), updated_at = NOW(), is_published = FALSE
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id, title
    `, [id]);
}
// Handles 'softDeleteCohortsByProgramId' workflow for this module.
export async function softDeleteCohortsByProgramId(programId: number, db: DbClient = pool) {
    return db.query(`
      UPDATE cohorts
      SET deleted_at = NOW(), updated_at = NOW(), allow_applications = FALSE
      WHERE program_id = $1
        AND deleted_at IS NULL
    `, [programId]);
}
// Handles 'findActiveProgramById' workflow for this module.
export async function findActiveProgramById(programId: number, db: DbClient = pool) {
    return db.query(`
      SELECT id
      FROM programs
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `, [programId]);
}
// Handles 'createCohort' workflow for this module.
export async function createCohort(input: CohortInput, db: DbClient = pool) {
    return db.query(`
      INSERT INTO cohorts
        (
          program_id,
          name,
          status,
          allow_applications,
          capacity,
          enrollment_open_at,
          enrollment_close_at,
          start_date,
          end_date,
          auto_announce,
          attendance_days,
          attendance_start_time,
          attendance_end_time,
          created_at,
          updated_at
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [
        input.program_id,
        input.name,
        input.status,
        input.allow_applications,
        input.capacity ?? null,
        input.enrollment_open_at ?? null,
        input.enrollment_close_at ?? null,
        input.start_date ?? null,
        input.end_date ?? null,
        input.auto_announce ?? false,
        input.attendance_days ?? null,
        input.attendance_start_time ?? null,
        input.attendance_end_time ?? null,
    ]);
}
// Handles 'countCohorts' workflow for this module.
export async function countCohorts(whereClause: string, params: unknown[], db: DbClient = pool) {
    const scopedWhere = whereClause
        ? `${whereClause} AND c.deleted_at IS NULL AND p.deleted_at IS NULL`
        : "WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL";
    return db.query(`
      SELECT COUNT(*)::int AS total
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      ${scopedWhere}
    `, params);
}
// Handles 'listCohorts' workflow for this module.
export async function listCohorts(
    whereClause: string,
    sortBy: string,
    order: string,
    params: unknown[],
    limit: number,
    offset: number,
    db: DbClient = pool,
) {
    const scopedWhere = whereClause
        ? `${whereClause} AND c.deleted_at IS NULL AND p.deleted_at IS NULL`
        : "WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL";
    return db.query(`
      SELECT
        c.id,
        c.program_id,
        p.title AS program_title,
        c.name,
        CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS status,
        (CASE WHEN c.status = 'open' THEN TRUE ELSE FALSE END) AS allow_applications,
        c.auto_announce,
        c.capacity,
        c.enrollment_open_at,
        c.enrollment_close_at,
        c.start_date,
        c.end_date,
        c.attendance_days,
        c.attendance_start_time,
        c.attendance_end_time,
        c.created_at,
        c.updated_at
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      ${scopedWhere}
      ORDER BY c.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'getCohortStatusById' workflow for this module.
export async function getCohortStatusById(id: number, db: DbClient = pool) {
    return db.query(`
      SELECT
        c.id,
        c.program_id,
        p.title AS program_title,
        c.name,
        CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS status,
        c.enrollment_open_at,
        c.enrollment_close_at,
        c.start_date,
        c.end_date,
        c.auto_announce,
        c.attendance_days,
        c.attendance_start_time,
        c.attendance_end_time
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = $1
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
    `, [id]);
}
// Handles 'updateCohort' workflow for this module.
export async function updateCohort(id: number, setClause: string, values: unknown[], db: DbClient = pool) {
    return db.query(`
      UPDATE cohorts
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
        AND deleted_at IS NULL
      RETURNING *
    `, [...values, id]);
}
// Handles 'deleteCohort' workflow for this module.
export async function deleteCohort(id: number, db: DbClient = pool) {
    return db.query(`
      UPDATE cohorts
      SET deleted_at = NOW(), updated_at = NOW(), allow_applications = FALSE
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id, name
    `, [id]);
}
// Handles 'openCohort' workflow for this module.
export async function openCohort(id: number, db: DbClient = pool) {
    return db.query(`
      UPDATE cohorts
      SET status = 'open', allow_applications = TRUE, enrollment_open_at = COALESCE(enrollment_open_at, NOW()), updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
    `, [id]);
}
// Handles 'closeCohort' workflow for this module.
export async function closeCohort(id: number, db: DbClient = pool) {
    return db.query(`
      UPDATE cohorts
      SET
        status = CASE WHEN status = 'open' THEN 'running' ELSE status END,
        allow_applications = FALSE,
        enrollment_close_at = COALESCE(enrollment_close_at, NOW()),
        updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING *
    `, [id]);
}
// Handles 'countCohortInstructors' workflow for this module.
export async function countCohortInstructors(whereClause: string, params: unknown[], db: DbClient = pool) {
    const scopedWhere = whereClause ? `${whereClause} AND c.deleted_at IS NULL` : "WHERE c.deleted_at IS NULL";
    return db.query(`
      SELECT COUNT(*)::int AS total
      FROM cohort_instructors ci
      JOIN cohorts c ON c.id = ci.cohort_id
      JOIN instructor_profiles ip ON ip.user_id = ci.instructor_user_id
      ${scopedWhere}
    `, params);
}
// Handles 'listCohortInstructors' workflow for this module.
export async function listCohortInstructors(
    whereClause: string,
    sortBy: string,
    order: string,
    params: unknown[],
    limit: number,
    offset: number,
    db: DbClient = pool,
) {
    const scopedWhere = whereClause ? `${whereClause} AND c.deleted_at IS NULL` : "WHERE c.deleted_at IS NULL";
    return db.query(`
      SELECT
        ci.cohort_id,
        ci.instructor_user_id,
        ci.cohort_role,
        ip.full_name,
        ip.expertise,
        ip.avatar_url
      FROM cohort_instructors ci
      JOIN cohorts c ON c.id = ci.cohort_id
      JOIN instructor_profiles ip ON ip.user_id = ci.instructor_user_id
      ${scopedWhere}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'findActiveInstructor' workflow for this module.
export async function findActiveInstructor(instructorUserId: number, db: DbClient = pool) {
    return db.query(`
      SELECT id
      FROM users
      WHERE id = $1
        AND is_instructor = TRUE
        AND is_active = TRUE
    `, [instructorUserId]);
}
// Handles 'upsertCohortInstructor' workflow for this module.
export async function upsertCohortInstructor(cohortId: number, instructorUserId: number, cohortRole: string, db: DbClient = pool) {
    return db.query(`
      INSERT INTO cohort_instructors (cohort_id, instructor_user_id, cohort_role)
      SELECT $1, $2, $3
      WHERE EXISTS (
        SELECT 1
        FROM cohorts
        WHERE id = $1
          AND deleted_at IS NULL
      )
      ON CONFLICT (cohort_id, instructor_user_id)
      DO UPDATE SET cohort_role = EXCLUDED.cohort_role
      RETURNING *
    `, [cohortId, instructorUserId, cohortRole]);
}

// Handles 'deleteCohortInstructor' workflow for this module.
export async function deleteCohortInstructor(cohortId: number, instructorUserId: number, db: DbClient = pool) {
    return db.query(`
      DELETE FROM cohort_instructors
      WHERE cohort_id = $1
        AND instructor_user_id = $2
      RETURNING cohort_id, instructor_user_id
    `, [cohortId, instructorUserId]);
}

