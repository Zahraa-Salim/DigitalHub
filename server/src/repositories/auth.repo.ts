// File: server/src/repositories/auth.repo.ts
// Purpose: Runs the database queries used for auth.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type AdminProfileInput = {
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  admin_role?: string | null;
  is_public?: boolean;
  sort_order?: number | null;
};
// Handles 'findActiveAdminByEmail' workflow for this module.
export async function findActiveAdminByEmail(email: string, db: DbClient = pool) {
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

// Handles 'findUserByEmailForPasswordReset' workflow for this module.
export async function findUserByEmailForPasswordReset(email: string, db: DbClient = pool) {
    return db.query(`
      SELECT id, email, is_active
      FROM users
      WHERE email = $1
      LIMIT 1
    `, [email]);
}

// Handles 'setUserPasswordResetToken' workflow for this module.
export async function setUserPasswordResetToken(
    userId: number,
    tokenHash: string,
    expiresAt: string | Date,
    db: DbClient = pool,
) {
    return db.query(`
      UPDATE users
      SET
        reset_password_token = $1,
        reset_password_expires = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id
    `, [tokenHash, expiresAt, userId]);
}

// Handles 'findUserByPasswordResetToken' workflow for this module.
export async function findUserByPasswordResetToken(tokenHash: string, db: DbClient = pool) {
    return db.query(`
      SELECT id
      FROM users
      WHERE reset_password_token = $1
        AND reset_password_expires > NOW()
      LIMIT 1
    `, [tokenHash]);
}

// Handles 'clearUserPasswordResetToken' workflow for this module.
export async function clearUserPasswordResetToken(userId: number, db: DbClient = pool) {
    return db.query(`
      UPDATE users
      SET
        reset_password_token = NULL,
        reset_password_expires = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [userId]);
}
// Handles 'updateLastLogin' workflow for this module.
export async function updateLastLogin(userId: number, db: DbClient = pool) {
    try {
        return await db.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [userId]);
    }
    catch (error: unknown) {
        // Keep login functional on environments that haven't added this column yet.
        const maybeError = error as { code?: unknown };
        if (String(maybeError.code || "") === "42703") {
            return { rows: [], rowCount: 0 };
        }
        throw error;
    }
}
// Handles 'findAdminProfileByUserId' workflow for this module.
export async function findAdminProfileByUserId(userId: number, db: DbClient = pool) {
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
// Handles 'listAdminProfiles' workflow for this module.
export async function listAdminProfiles(db: DbClient = pool) {
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

// Handles 'countUsersForMessaging' workflow for this module.
export async function countUsersForMessaging(whereClause: string, params: unknown[], db: DbClient = pool) {
    return db.query(`
      SELECT COUNT(*)::int AS total
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      ${whereClause}
    `, params);
}

// Handles 'listUsersForMessaging' workflow for this module.
export async function listUsersForMessaging(
    whereClause: string,
    sortBy: string,
    order: string,
    params: unknown[],
    limit: number,
    offset: number,
    db: DbClient = pool,
) {
    return db.query(`
      SELECT
        u.id,
        u.email,
        u.phone,
        u.is_admin,
        u.is_instructor,
        u.is_student,
        u.is_active,
        u.created_at,
        COALESCE(
          NULLIF(ap.full_name, ''),
          NULLIF(ip.full_name, ''),
          NULLIF(sp.full_name, ''),
          NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
          'User'
        ) AS full_name
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}

// Handles 'findUsersForMessagingByIds' workflow for this module.
export async function findUsersForMessagingByIds(userIds: number[], db: DbClient = pool) {
    return db.query(`
      SELECT
        u.id,
        u.email,
        u.phone,
        COALESCE(
          NULLIF(ap.full_name, ''),
          NULLIF(ip.full_name, ''),
          NULLIF(sp.full_name, ''),
          NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
          'User'
        ) AS full_name
      FROM users u
      LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      LEFT JOIN instructor_profiles ip ON ip.user_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.id = ANY($1::bigint[])
        AND u.is_active = TRUE
    `, [userIds]);
}
// Handles 'getUserPasswordHash' workflow for this module.
export async function getUserPasswordHash(userId: number, db: DbClient = pool) {
    return db.query(`
      SELECT password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
    `, [userId]);
}
// Handles 'updateUserAccount' workflow for this module.
export async function updateUserAccount(
    userId: number,
    setClause: string,
    values: unknown[],
    db: DbClient = pool,
) {
    return db.query(`
      UPDATE users
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING id, email, phone, is_admin, is_active
    `, [...values, userId]);
}
// Handles 'updateUserPasswordHash' workflow for this module.
export async function updateUserPasswordHash(userId: number, passwordHash: string, db: DbClient = pool) {
    return db.query(`
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `, [passwordHash, userId]);
}
// Handles 'upsertAdminProfile' workflow for this module.
export async function upsertAdminProfile(userId: number, input: AdminProfileInput, db: DbClient = pool) {
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
        created_at
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
        sort_order = EXCLUDED.sort_order
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

