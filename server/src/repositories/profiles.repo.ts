// File Summary: server/src/repositories/profiles.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function countProfiles(tableName, whereClause, params, db = pool) {
    return db.query(`
      SELECT COUNT(*)::int AS total
      FROM ${tableName} p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
    `, params);
}
export async function listProfiles(tableName, whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT p.*, u.email, u.phone, u.is_active
      FROM ${tableName} p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
      ORDER BY p.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function updateProfile(tableName, userId, setClause, values, db = pool) {
    return db.query(`
      UPDATE ${tableName}
      SET ${setClause}
      WHERE user_id = $${values.length + 1}
      RETURNING *
    `, [...values, userId]);
}
export async function updateProfileVisibility(tableName, userId, isPublic, db = pool) {
    return db.query(`
      UPDATE ${tableName}
      SET is_public = $1
      WHERE user_id = $2
      RETURNING *
    `, [isPublic, userId]);
}


