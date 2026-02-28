// File Summary: server/src/repositories/auth.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function findActiveAdminByEmail(email, db = pool) {
    return db.query(`
      SELECT
        u.id,
        u.email,
        u.password_hash,
        COALESCE(ap.full_name, 'Admin') AS full_name,
        COALESCE(ap.admin_role, 'admin') AS admin_role
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      WHERE u.email = $1
        AND u.is_admin = TRUE
        AND u.is_active = TRUE
      LIMIT 1
    `, [email]);
}
export async function findUserByEmailOrPhone(email, phone, db = pool) {
    return db.query(`
      SELECT id
      FROM users
      WHERE ($1::text IS NOT NULL AND email = $1)
         OR ($2::text IS NOT NULL AND phone = $2)
      LIMIT 1
    `, [email ?? null, phone ?? null]);
}
export async function updateLastLogin(userId, db = pool) {
    return db.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [userId]);
}
export async function findAdminProfileByUserId(userId, db = pool) {
    return db.query(`
      SELECT
        u.id,
        u.email,
        u.phone,
        u.is_admin,
        u.is_active,
        COALESCE(ap.full_name, 'Admin') AS full_name,
        COALESCE(ap.admin_role, 'admin') AS admin_role,
        ap.avatar_url,
        ap.bio,
        ap.job_title,
        ap.linkedin_url,
        ap.github_url,
        ap.portfolio_url,
        COALESCE(ap.is_public, TRUE) AS is_public,
        COALESCE(ap.sort_order, 0) AS sort_order
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      WHERE u.id = $1
        AND u.is_admin = TRUE
      LIMIT 1
    `, [userId]);
}
export async function listAdminProfiles(db = pool) {
    return db.query(`
      SELECT
        u.id,
        u.email,
        u.phone,
        u.is_admin,
        u.is_active,
        COALESCE(ap.full_name, 'Admin') AS full_name,
        COALESCE(ap.admin_role, 'admin') AS admin_role,
        ap.avatar_url,
        ap.bio,
        ap.job_title,
        ap.linkedin_url,
        ap.github_url,
        ap.portfolio_url,
        COALESCE(ap.is_public, TRUE) AS is_public,
        COALESCE(ap.sort_order, 0) AS sort_order
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      WHERE u.is_admin = TRUE
      ORDER BY
        CASE COALESCE(ap.admin_role, 'admin')
          WHEN 'super_admin' THEN 0
          ELSE 1
        END,
        COALESCE(ap.sort_order, 0),
        COALESCE(ap.full_name, 'Admin')
    `);
}
export async function createAdminUser(input, db = pool) {
    return db.query(`
      INSERT INTO users (email, phone, password_hash, is_admin, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, TRUE, $4, NOW(), NOW())
      RETURNING id
    `, [input.email ?? null, input.phone ?? null, input.password_hash, input.is_active ?? true]);
}
export async function deleteAdminUser(userId, db = pool) {
    return db.query(`
      DELETE FROM users
      WHERE id = $1
        AND is_admin = TRUE
      RETURNING id
    `, [userId]);
}
export async function getUserPasswordHash(userId, db = pool) {
    return db.query(`
      SELECT password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
    `, [userId]);
}
export async function updateUserAccount(userId, setClause, values, db = pool) {
    return db.query(`
      UPDATE users
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING id, email, phone, is_admin, is_active
    `, [...values, userId]);
}
export async function updateUserPasswordHash(userId, passwordHash, db = pool) {
    return db.query(`
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `, [passwordHash, userId]);
}
export async function upsertAdminProfile(userId, input, db = pool) {
    return db.query(`
      INSERT INTO admin_profiles (
        user_id,
        full_name,
        avatar_url,
        bio,
        job_title,
        linkedin_url,
        github_url,
        portfolio_url,
        admin_role,
        is_public,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        bio = EXCLUDED.bio,
        job_title = EXCLUDED.job_title,
        linkedin_url = EXCLUDED.linkedin_url,
        github_url = EXCLUDED.github_url,
        portfolio_url = EXCLUDED.portfolio_url,
        admin_role = EXCLUDED.admin_role,
        is_public = EXCLUDED.is_public,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
      RETURNING *
    `, [
        userId,
        input.full_name,
        input.avatar_url,
        input.bio,
        input.job_title,
        input.linkedin_url,
        input.github_url,
        input.portfolio_url,
        input.admin_role,
        input.is_public,
        input.sort_order,
    ]);
}


