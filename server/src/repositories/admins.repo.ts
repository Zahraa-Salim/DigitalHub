// File Summary: server/src/repositories/admins.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for super-admin management of admin accounts.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck

import { pool } from "../db/index.js";

export async function countAdmins(whereClause, params, db = pool) {
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

export async function listAdmins(whereClause, sortBy, order, params, limit, offset, db = pool) {
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

export async function createAdminUser(input, db = pool) {
  return db.query(
    `
      INSERT INTO users (email, password_hash, is_admin, is_active, created_at, updated_at)
      VALUES ($1, $2, TRUE, TRUE, NOW(), NOW())
      RETURNING id
    `,
    [input.email, input.password_hash],
  );
}

export async function setAdminActiveByUserId(userId, isActive, db = pool) {
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

export async function updateAdminUserById(userId, setClause, values, db = pool) {
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

export async function findAdminForUpdate(userId, db = pool) {
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

export async function findAdminByUserId(userId, db = pool) {
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
