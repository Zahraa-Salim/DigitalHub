// File Summary: server/src/repositories/programs.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function createProgram(input, db = pool) {
    return db.query(`
      INSERT INTO programs
        (slug, title, summary, description, requirements, default_capacity, is_published, created_by, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
        input.slug,
        input.title,
        input.summary ?? null,
        input.description ?? null,
        input.requirements ?? null,
        input.default_capacity ?? null,
        input.is_published,
        input.created_by,
    ]);
}
export async function countPrograms(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM programs ${whereClause}`, params);
}
export async function listPrograms(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT id, slug, title, summary, description, requirements, default_capacity, is_published, created_by, created_at, updated_at
      FROM programs
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function updateProgram(id, setClause, values, db = pool) {
    return db.query(`
      UPDATE programs
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING *
    `, [...values, id]);
}
export async function deleteProgram(id, db = pool) {
    return db.query("DELETE FROM programs WHERE id = $1 RETURNING id, title", [id]);
}
export async function createCohort(input, db = pool) {
    return db.query(`
      INSERT INTO cohorts
        (program_id, name, status, allow_applications, capacity, enrollment_open_at, enrollment_close_at, start_date, end_date, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
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
    ]);
}
export async function countCohorts(whereClause, params, db = pool) {
    return db.query(`
      SELECT COUNT(*)::int AS total
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      ${whereClause}
    `, params);
}
export async function listCohorts(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT
        c.id,
        c.program_id,
        p.title AS program_title,
        c.name,
        c.status,
        c.allow_applications,
        c.capacity,
        c.enrollment_open_at,
        c.enrollment_close_at,
        c.start_date,
        c.end_date,
        c.created_at,
        c.updated_at
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      ${whereClause}
      ORDER BY c.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function getCohortStatusById(id, db = pool) {
    return db.query("SELECT status FROM cohorts WHERE id = $1", [id]);
}
export async function updateCohort(id, setClause, values, db = pool) {
    return db.query(`
      UPDATE cohorts
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING *
    `, [...values, id]);
}
export async function deleteCohort(id, db = pool) {
    return db.query("DELETE FROM cohorts WHERE id = $1 RETURNING id, name", [id]);
}
export async function openCohort(id, db = pool) {
    return db.query(`
      UPDATE cohorts
      SET status = 'open', allow_applications = TRUE, enrollment_open_at = COALESCE(enrollment_open_at, NOW()), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
}
export async function closeCohort(id, db = pool) {
    return db.query(`
      UPDATE cohorts
      SET
        status = CASE WHEN status = 'open' THEN 'running' ELSE status END,
        allow_applications = FALSE,
        enrollment_close_at = COALESCE(enrollment_close_at, NOW()),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
}
export async function countCohortInstructors(whereClause, params, db = pool) {
    return db.query(`
      SELECT COUNT(*)::int AS total
      FROM cohort_instructors ci
      JOIN instructor_profiles ip ON ip.user_id = ci.instructor_user_id
      ${whereClause}
    `, params);
}
export async function listCohortInstructors(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT
        ci.cohort_id,
        ci.instructor_user_id,
        ci.cohort_role,
        ip.full_name,
        ip.expertise,
        ip.avatar_url
      FROM cohort_instructors ci
      JOIN instructor_profiles ip ON ip.user_id = ci.instructor_user_id
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function findActiveInstructor(instructorUserId, db = pool) {
    return db.query(`
      SELECT id
      FROM users
      WHERE id = $1
        AND is_instructor = TRUE
        AND is_active = TRUE
    `, [instructorUserId]);
}
export async function upsertCohortInstructor(cohortId, instructorUserId, cohortRole, db = pool) {
    return db.query(`
      INSERT INTO cohort_instructors (cohort_id, instructor_user_id, cohort_role)
      VALUES ($1, $2, $3)
      ON CONFLICT (cohort_id, instructor_user_id)
      DO UPDATE SET cohort_role = EXCLUDED.cohort_role
      RETURNING *
    `, [cohortId, instructorUserId, cohortRole]);
}


