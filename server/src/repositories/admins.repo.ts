// File: server/src/repositories/admins.repo.ts
// Purpose: Runs the database queries used for admins.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type AdminCreateInput = {
  email: string;
  password_hash: string;
};

// Handles 'countAdmins' workflow for this module.
export async function countAdmins(whereClause: string, params: unknown[], db: DbClient = pool) {
  return db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      ${whereClause}
    `,
    params,
  );
}

// Handles 'listAdmins' workflow for this module.
export async function listAdmins(
  whereClause: string,
  sortBy: string,
  order: string,
  params: unknown[],
  limit: number,
  offset: number,
  db: DbClient = pool,
) {
  return db.query(
    `
      SELECT
        u.id AS user_id,
        u.email,
        u.is_active,
        u.created_at,
        u.last_login_at,
        COALESCE(ap.full_name, 'Admin') AS full_name,
        ap.job_title,
        ap.avatar_url,
        ap.bio,
        ap.linkedin_url,
        ap.github_url,
        ap.portfolio_url,
        COALESCE(ap.is_public, TRUE) AS is_public,
        COALESCE(ap.sort_order, 0) AS sort_order,
        COALESCE(ap.admin_role, 'admin') AS admin_role
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, limit, offset],
  );
}

// Handles 'createAdminUser' workflow for this module.
export async function createAdminUser(input: AdminCreateInput, db: DbClient = pool) {
  return db.query(
    `
      INSERT INTO users (email, password_hash, is_admin, is_active, created_at, updated_at)
      VALUES ($1, $2, TRUE, TRUE, NOW(), NOW())
      RETURNING id
    `,
    [input.email, input.password_hash],
  );
}

// Handles 'setAdminActiveByUserId' workflow for this module.
export async function setAdminActiveByUserId(userId: number, isActive: boolean, db: DbClient = pool) {
  return db.query(
    `
      UPDATE users
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
        AND is_admin = TRUE
      RETURNING id
    `,
    [isActive, userId],
  );
}

// Handles 'updateAdminUserById' workflow for this module.
export async function updateAdminUserById(userId: number, setClause: string, values: unknown[], db: DbClient = pool) {
  return db.query(
    `
      UPDATE users
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
        AND is_admin = TRUE
      RETURNING id
    `,
    [...values, userId],
  );
}

// Handles 'findAdminForUpdate' workflow for this module.
export async function findAdminForUpdate(userId: number, db: DbClient = pool) {
  return db.query(
    `
      SELECT
        u.id AS user_id,
        u.email,
        u.is_admin,
        u.is_active,
        u.created_at,
        u.last_login_at,
        COALESCE(ap.full_name, 'Admin') AS full_name,
        ap.job_title,
        ap.avatar_url,
        ap.bio,
        ap.linkedin_url,
        ap.github_url,
        ap.portfolio_url,
        COALESCE(ap.is_public, TRUE) AS is_public,
        COALESCE(ap.sort_order, 0) AS sort_order,
        COALESCE(ap.admin_role, 'admin') AS admin_role
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      WHERE u.id = $1
        AND u.is_admin = TRUE
      FOR UPDATE
    `,
    [userId],
  );
}

// Handles 'findAdminByUserId' workflow for this module.
export async function findAdminByUserId(userId: number, db: DbClient = pool) {
  return db.query(
    `
      SELECT
        u.id AS user_id,
        u.email,
        u.is_active,
        u.created_at,
        u.last_login_at,
        COALESCE(ap.full_name, 'Admin') AS full_name,
        ap.job_title,
        ap.avatar_url,
        ap.bio,
        ap.linkedin_url,
        ap.github_url,
        ap.portfolio_url,
        COALESCE(ap.is_public, TRUE) AS is_public,
        COALESCE(ap.sort_order, 0) AS sort_order,
        COALESCE(ap.admin_role, 'admin') AS admin_role
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      WHERE u.id = $1
        AND u.is_admin = TRUE
      LIMIT 1
    `,
    [userId],
  );
}

