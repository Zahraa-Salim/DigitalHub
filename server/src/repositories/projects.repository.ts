// File Summary: server/src/repositories/projects.repository.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for projects administration and public listing.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";

export async function createProject(input, db = pool) {
  return db.query(
    `
      INSERT INTO projects
        (student_user_id, cohort_id, title, description, image_url, github_url, live_url, is_public, sort_order, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `,
    [
      input.student_user_id,
      input.cohort_id ?? null,
      input.title,
      input.description ?? null,
      input.image_url ?? null,
      input.github_url ?? null,
      input.live_url ?? null,
      input.is_public ?? false,
      input.sort_order ?? 0,
    ],
  );
}

export async function countProjects(whereClause, params, db = pool) {
  return db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM projects p
      LEFT JOIN student_profiles sp ON sp.user_id = p.student_user_id
      ${whereClause}
    `,
    params,
  );
}

export async function listProjects(whereClause, sortBy, order, params, limit, offset, db = pool) {
  return db.query(
    `
      SELECT
        p.id,
        p.student_user_id,
        p.cohort_id,
        p.title,
        p.description,
        p.image_url,
        p.github_url,
        p.live_url,
        p.is_public,
        p.sort_order,
        p.created_at,
        p.updated_at,
        sp.full_name AS student_full_name,
        sp.public_slug AS student_public_slug
      FROM projects p
      LEFT JOIN student_profiles sp ON sp.user_id = p.student_user_id
      ${whereClause}
      ORDER BY p.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, limit, offset],
  );
}

export async function updateProject(id, setClause, values, db = pool) {
  return db.query(
    `
      UPDATE projects
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING *
    `,
    [...values, id],
  );
}

export async function deleteProject(id, db = pool) {
  return db.query(
    `
      DELETE FROM projects
      WHERE id = $1
      RETURNING id, student_user_id, cohort_id, title
    `,
    [id],
  );
}

export async function getPublicProjectById(id, db = pool) {
  return db.query(
    `
      SELECT
        p.id,
        p.student_user_id,
        p.cohort_id,
        p.title,
        p.description,
        p.image_url,
        p.github_url,
        p.live_url,
        p.is_public,
        p.sort_order,
        p.created_at,
        p.updated_at,
        sp.full_name AS student_full_name,
        sp.public_slug AS student_public_slug
      FROM projects p
      LEFT JOIN student_profiles sp ON sp.user_id = p.student_user_id
      WHERE p.id = $1
        AND p.is_public = TRUE
      LIMIT 1
    `,
    [id],
  );
}

export async function listPublicProjectsByStudentUserId(studentUserId, db = pool) {
  return db.query(
    `
      SELECT
        p.id,
        p.student_user_id,
        p.cohort_id,
        p.title,
        p.description,
        p.image_url,
        p.github_url,
        p.live_url,
        p.is_public,
        p.sort_order,
        p.created_at,
        p.updated_at
      FROM projects p
      WHERE p.student_user_id = $1
        AND p.is_public = TRUE
      ORDER BY p.sort_order ASC, p.created_at DESC
    `,
    [studentUserId],
  );
}

export async function findCohortById(cohortId, db = pool) {
  return db.query(
    `
      SELECT 1
      FROM cohorts
      WHERE id = $1
      LIMIT 1
    `,
    [cohortId],
  );
}
