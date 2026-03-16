// File: server/src/repositories/projects.repository.ts
// Purpose: Runs the database queries used for projects.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type ProjectInput = {
  student_user_id: number;
  cohort_id?: number | null;
  title: string;
  description?: string | null;
  image_url?: string | null;
  github_url?: string | null;
  live_url?: string | null;
  is_public?: boolean;
  sort_order?: number;
};

// Handles 'createProject' workflow for this module.
export async function createProject(input: ProjectInput, db: DbClient = pool) {
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

// Handles 'countProjects' workflow for this module.
export async function countProjects(whereClause: string, params: unknown[], db: DbClient = pool) {
  const scopedWhere = whereClause
    ? `${whereClause} AND p.deleted_at IS NULL`
    : "WHERE p.deleted_at IS NULL";
  return db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM projects p
      LEFT JOIN student_profiles sp ON sp.user_id = p.student_user_id
      ${scopedWhere}
    `,
    params,
  );
}

// Handles 'listProjects' workflow for this module.
export async function listProjects(
  whereClause: string,
  sortBy: string,
  order: string,
  params: unknown[],
  limit: number,
  offset: number,
  db: DbClient = pool,
) {
  const scopedWhere = whereClause
    ? `${whereClause} AND p.deleted_at IS NULL`
    : "WHERE p.deleted_at IS NULL";
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
      ${scopedWhere}
      ORDER BY p.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, limit, offset],
  );
}

// Handles 'updateProject' workflow for this module.
export async function updateProject(id: number, setClause: string, values: unknown[], db: DbClient = pool) {
  return db.query(
    `
      UPDATE projects
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
        AND deleted_at IS NULL
      RETURNING *
    `,
    [...values, id],
  );
}

// Handles 'deleteProject' workflow for this module.
export async function deleteProject(id: number, db: DbClient = pool) {
  return db.query(
    `
      UPDATE projects
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id, student_user_id, cohort_id, title
    `,
    [id],
  );
}

// Handles 'getPublicProjectById' workflow for this module.
export async function getPublicProjectById(id: number, db: DbClient = pool) {
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
        AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [id],
  );
}

// Handles 'listPublicProjectsByStudentUserId' workflow for this module.
export async function listPublicProjectsByStudentUserId(studentUserId: number, db: DbClient = pool) {
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
        AND p.deleted_at IS NULL
      ORDER BY p.sort_order ASC, p.created_at DESC
    `,
    [studentUserId],
  );
}

// Handles 'findCohortById' workflow for this module.
export async function findCohortById(cohortId: number, db: DbClient = pool) {
  return db.query(
    `
      SELECT 1
      FROM cohorts
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [cohortId],
  );
}

