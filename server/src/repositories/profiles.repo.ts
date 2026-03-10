// File: server/src/repositories/profiles.repo.ts
// Purpose: Runs the database queries used for profiles.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

// @ts-nocheck

import { pool } from "../db/index.js";
// Handles 'countProfiles' workflow for this module.
export async function countProfiles(tableName, whereClause, params, db = pool) {
    return db.query(`
      SELECT COUNT(*)::int AS total
      FROM ${tableName} p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
    `, params);
}
// Handles 'listProfiles' workflow for this module.
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
// Handles 'updateProfile' workflow for this module.
export async function updateProfile(tableName, userId, setClause, values, db = pool) {
    return db.query(`
      UPDATE ${tableName}
      SET ${setClause}
      WHERE user_id = $${values.length + 1}
      RETURNING *
    `, [...values, userId]);
}
// Handles 'updateProfileVisibility' workflow for this module.
export async function updateProfileVisibility(tableName, userId, isPublic, db = pool) {
    return db.query(`
      UPDATE ${tableName}
      SET is_public = $1
      WHERE user_id = $2
      RETURNING *
    `, [isPublic, userId]);
}

// Handles 'createInstructorUser' workflow for this module.
export async function createInstructorUser(input, db = pool) {
    return db.query(`
      INSERT INTO users (
        email,
        phone,
        password_hash,
        is_admin,
        is_instructor,
        is_student,
        is_active
      )
      VALUES ($1, $2, $3, FALSE, TRUE, FALSE, TRUE)
      RETURNING id
    `, [input.email ?? null, input.phone ?? null, input.password_hash]);
}

// Handles 'createInstructorProfile' workflow for this module.
export async function createInstructorProfile(userId, payload, db = pool) {
    return db.query(`
      INSERT INTO instructor_profiles (
        user_id,
        full_name,
        avatar_url,
        bio,
        expertise,
        skills,
        linkedin_url,
        github_url,
        portfolio_url,
        is_public,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
        userId,
        payload.full_name,
        payload.avatar_url ?? null,
        payload.bio ?? null,
        payload.expertise ?? null,
        payload.skills ?? null,
        payload.linkedin_url ?? null,
        payload.github_url ?? null,
        payload.portfolio_url ?? null,
        payload.is_public ?? false,
        payload.sort_order ?? null,
    ]);
}

// Handles 'getInstructorProfileByUserId' workflow for this module.
export async function getInstructorProfileByUserId(userId, db = pool) {
    return db.query(`
      SELECT
        p.*,
        u.email,
        u.phone,
        u.is_active,
        u.is_instructor
      FROM instructor_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1
    `, [userId]);
}

// Handles 'setInstructorActiveByUserId' workflow for this module.
export async function setInstructorActiveByUserId(userId, isActive, db = pool) {
    return db.query(`
      UPDATE users
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
        AND is_instructor = TRUE
      RETURNING id
    `, [isActive, userId]);
}

