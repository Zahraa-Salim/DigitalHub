// File: server/src/repositories/profiles.repository.ts
// Purpose: Runs the database queries used for profiles.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type StudentProfileUpdates = {
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  is_public?: boolean;
  featured?: boolean;
  featured_rank?: number | null;
  public_slug?: string | null;
  is_graduated?: boolean;
  is_working?: boolean;
  open_to_work?: boolean;
  company_work_for?: string | null;
};

/**
 * Fetch student user data with profile
 * SELECT u.id, u.email, u.phone, u.is_student, u.is_instructor, u.is_admin, sp.*
 * FROM users u
 * JOIN student_profiles sp ON sp.user_id = u.id
 * WHERE u.id = $1
 */
export async function getStudentProfileWithUser(userId: number, db: DbClient = pool) {
  return db.query(
    `
    SELECT
      u.id,
      u.email,
      u.phone,
      u.is_active,
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
      sp.admin_status,
      sp.dropout_reason,
      sp.status_updated_at,
      sp.status_updated_by,
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
export async function getStudentProjects(userId: number, db: DbClient = pool) {
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
export async function getPublicStudentProfileBySlug(publicSlug: string, db: DbClient = pool) {
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
export async function getPublicStudentProjects(userId: number, db: DbClient = pool) {
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
export async function isPublicSlugUnique(
  publicSlug: string,
  excludeUserId: number | null = null,
  db: DbClient = pool,
) {
  let query = `
    SELECT COUNT(*) as count
    FROM student_profiles
    WHERE public_slug = $1
  `;
  const params: Array<string | number> = [publicSlug];

  if (excludeUserId !== null) {
    query += ` AND user_id != $${params.length + 1}`;
    params.push(excludeUserId);
  }

  return db.query(query, params);
}

/**
 * Update student profile - returns updated profile
 */
export async function updateStudentProfile(userId: number, updates: StudentProfileUpdates, db: DbClient = pool) {
  const fields: string[] = [];
  const values: unknown[] = [];
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
export async function getUserById(userId: number, db: DbClient = pool) {
  return db.query(
    `
    SELECT id, email, phone
    FROM users
    WHERE id = $1
    `,
    [userId]
  );
}

// Handles 'getStudentEnrollments' workflow for this module.
export async function getStudentEnrollments(userId: number, db: DbClient = pool) {
  return db.query(
    `
    SELECT
      e.id,
      e.student_user_id,
      e.cohort_id,
      e.application_id,
      e.status,
      e.enrolled_at,
      c.name AS cohort_name,
      CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS cohort_status,
      p.id AS program_id,
      p.title AS program_title
    FROM enrollments e
    LEFT JOIN cohorts c ON c.id = e.cohort_id AND c.deleted_at IS NULL
    LEFT JOIN programs p ON p.id = c.program_id AND p.deleted_at IS NULL
    WHERE e.student_user_id = $1
    ORDER BY e.enrolled_at DESC NULLS LAST, e.id DESC
    `,
    [userId],
  );
}

// Handles 'countStudentProfilesForAdmin' workflow for this module.
export async function countStudentProfilesForAdmin(whereClause: string, params: unknown[], db: DbClient = pool) {
  return db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM student_profiles sp
      JOIN users u ON u.id = sp.user_id
      ${whereClause}
    `,
    params,
  );
}

// Handles 'listStudentProfilesForAdmin' workflow for this module.
export async function listStudentProfilesForAdmin(
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
        sp.user_id,
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
        COALESCE(NULLIF(sp.admin_status, ''), CASE WHEN u.is_active THEN 'active' ELSE 'dropout' END) AS admin_status,
        sp.dropout_reason,
        sp.status_updated_at,
        sp.status_updated_by,
        sp.created_at,
        u.email,
        u.phone,
        u.is_active,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'enrollment_id', e.id,
              'cohort_id', c.id,
              'cohort_name', c.name,
              'cohort_status', CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END,
              'program_id', p.id,
              'program_title', p.title,
              'enrollment_status', e.status,
              'enrolled_at', e.enrolled_at
            )
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'::jsonb
        ) AS cohorts
      FROM student_profiles sp
      JOIN users u ON u.id = sp.user_id
      LEFT JOIN enrollments e ON e.student_user_id = sp.user_id
      LEFT JOIN cohorts c ON c.id = e.cohort_id AND c.deleted_at IS NULL
      LEFT JOIN programs p ON p.id = c.program_id AND p.deleted_at IS NULL
      ${whereClause}
      GROUP BY
        sp.user_id,
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
        sp.admin_status,
        sp.dropout_reason,
        sp.status_updated_at,
        sp.status_updated_by,
        sp.created_at,
        u.email,
        u.phone,
        u.is_active
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, limit, offset],
  );
}

// Handles 'updateStudentAdminStatus' workflow for this module.
export async function updateStudentAdminStatus(
  userId: number,
  status: string,
  reason: string | null,
  actorUserId: number,
  isActive: boolean,
  db: DbClient = pool,
) {
  await db.query(
    `
      UPDATE users
      SET is_active = $1,
          updated_at = NOW()
      WHERE id = $2
    `,
    [isActive, userId],
  );

  return db.query(
    `
      UPDATE student_profiles
      SET admin_status = $1,
          dropout_reason = $2,
          status_updated_at = NOW(),
          status_updated_by = $3
      WHERE user_id = $4
      RETURNING *
    `,
    [status, reason, actorUserId, userId],
  );
}

