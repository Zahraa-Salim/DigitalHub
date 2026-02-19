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
        COALESCE(mp.full_name, 'Admin') AS full_name
      FROM users u
      LEFT JOIN manager_profiles mp ON mp.user_id = u.id
      WHERE u.email = $1
        AND u.is_admin = TRUE
        AND u.is_active = TRUE
      LIMIT 1
    `, [email]);
}
export async function updateLastLogin(userId, db = pool) {
    return db.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [userId]);
}


