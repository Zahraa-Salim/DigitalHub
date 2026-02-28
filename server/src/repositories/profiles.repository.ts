// File Summary: server/src/repositories/profiles.repository.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for student profiles, users, and projects.
// Notes: Handles joined queries across users, student_profiles, and projects tables.
// @ts-nocheck
import { pool } from "../db/index.js";

/**
 * Fetch student user data with profile
 * SELECT u.id, u.email, u.phone, u.is_student, u.is_instructor, u.is_admin, sp.*
 * FROM users u
 * JOIN student_profiles sp ON sp.user_id = u.id
 * WHERE u.id = $1
 */
export async function getStudentProfileWithUser(userId, db = pool) {
  return db.query(
    `
    SELECT
      u.id,
      u.email,
      u.phone,
      u.is_student,
      u.is_instructor,
      u.is_admin,
      sp.user_id as profile_user_id,
      sp.full_name,
      sp.avatar_url,
      sp.bio,
      sp.linkedin_url,
      sp.github_url,
      sp.portfolio_url,
      sp.is_public,
      sp.featured,
      sp.featured_rank,
      sp.public_slug,
      sp.is_graduated,
      sp.is_working,
      sp.open_to_work,
      sp.company_work_for,
      sp.created_at as profile_created_at
    FROM users u
    JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.id = $1
    `,
    [userId]
  );
}

/**
 * Fetch all projects for a student
 * SELECT *
 * FROM projects
 * WHERE student_user_id = $1 AND deleted_at IS NULL
 * ORDER BY sort_order, created_at DESC
 */
export async function getStudentProjects(userId, db = pool) {
  return db.query(
    `
    SELECT
      id,
      student_user_id,
      title,
      description,
      image_url,
      github_url,
      live_url,
      is_public,
      sort_order,
      created_at,
      updated_at
    FROM projects
    WHERE student_user_id = $1
      AND deleted_at IS NULL
    ORDER BY sort_order, created_at DESC
    `,
    [userId]
  );
}

/**
 * Fetch public student profile by slug
 * SELECT *
 * FROM student_profiles
 * WHERE public_slug = $1 AND is_public = true
 */
export async function getPublicStudentProfileBySlug(publicSlug, db = pool) {
  return db.query(
    `
    SELECT
      user_id,
      full_name,
      avatar_url,
      bio,
      linkedin_url,
      github_url,
      portfolio_url,
      is_public,
      featured,
      featured_rank,
      public_slug,
      is_graduated,
      is_working,
      open_to_work,
      company_work_for
    FROM student_profiles
    WHERE public_slug = $1
      AND is_public = true
    `,
    [publicSlug]
  );
}

/**
 * Fetch public projects for a student
 * SELECT *
 * FROM projects
 * WHERE student_user_id = $1 AND is_public = true AND deleted_at IS NULL
 */
export async function getPublicStudentProjects(userId, db = pool) {
  return db.query(
    `
    SELECT
      id,
      student_user_id,
      title,
      description,
      image_url,
      github_url,
      live_url,
      is_public,
      sort_order,
      created_at
    FROM projects
    WHERE student_user_id = $1
      AND is_public = true
      AND deleted_at IS NULL
    ORDER BY sort_order, created_at DESC
    `,
    [userId]
  );
}

/**
 * Check if public_slug is unique
 */
export async function isPublicSlugUnique(publicSlug, excludeUserId = null, db = pool) {
  let query = `
    SELECT COUNT(*) as count
    FROM student_profiles
    WHERE public_slug = $1
  `;
  const params = [publicSlug];

  if (excludeUserId !== null) {
    query += ` AND user_id != $${params.length + 1}`;
    params.push(excludeUserId);
  }

  return db.query(query, params);
}

/**
 * Update student profile - returns updated profile
 */
export async function updateStudentProfile(userId, updates, db = pool) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Build dynamic update query
  if (updates.full_name !== undefined) {
    fields.push(`full_name = $${paramIndex}`);
    values.push(updates.full_name || null);
    paramIndex++;
  }
  if (updates.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex}`);
    values.push(updates.avatar_url || null);
    paramIndex++;
  }
  if (updates.bio !== undefined) {
    fields.push(`bio = $${paramIndex}`);
    values.push(updates.bio || null);
    paramIndex++;
  }
  if (updates.linkedin_url !== undefined) {
    fields.push(`linkedin_url = $${paramIndex}`);
    values.push(updates.linkedin_url || null);
    paramIndex++;
  }
  if (updates.github_url !== undefined) {
    fields.push(`github_url = $${paramIndex}`);
    values.push(updates.github_url || null);
    paramIndex++;
  }
  if (updates.portfolio_url !== undefined) {
    fields.push(`portfolio_url = $${paramIndex}`);
    values.push(updates.portfolio_url || null);
    paramIndex++;
  }
  if (updates.is_public !== undefined) {
    fields.push(`is_public = $${paramIndex}`);
    values.push(updates.is_public);
    paramIndex++;
  }
  if (updates.featured !== undefined) {
    fields.push(`featured = $${paramIndex}`);
    values.push(updates.featured);
    paramIndex++;
  }
  if (updates.featured_rank !== undefined) {
    fields.push(`featured_rank = $${paramIndex}`);
    values.push(updates.featured_rank || null);
    paramIndex++;
  }
  if (updates.public_slug !== undefined) {
    fields.push(`public_slug = $${paramIndex}`);
    values.push(updates.public_slug || null);
    paramIndex++;
  }
  if (updates.is_graduated !== undefined) {
    fields.push(`is_graduated = $${paramIndex}`);
    values.push(updates.is_graduated);
    paramIndex++;
  }
  if (updates.is_working !== undefined) {
    fields.push(`is_working = $${paramIndex}`);
    values.push(updates.is_working);
    paramIndex++;
  }
  if (updates.open_to_work !== undefined) {
    fields.push(`open_to_work = $${paramIndex}`);
    values.push(updates.open_to_work);
    paramIndex++;
  }
  if (updates.company_work_for !== undefined) {
    fields.push(`company_work_for = $${paramIndex}`);
    values.push(updates.company_work_for || null);
    paramIndex++;
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(userId);

  const query = `
    UPDATE student_profiles
    SET ${fields.join(", ")}
    WHERE user_id = $${paramIndex}
    RETURNING
      user_id,
      full_name,
      avatar_url,
      bio,
      linkedin_url,
      github_url,
      portfolio_url,
      is_public,
      featured,
      featured_rank,
      public_slug,
      is_graduated,
      is_working,
      open_to_work,
      company_work_for,
      created_at
    `;

  return db.query(query, values);
}

/**
 * Check if user exists
 */
export async function getUserById(userId, db = pool) {
  return db.query(
    `
    SELECT id, email, phone
    FROM users
    WHERE id = $1
    `,
    [userId]
  );
}
