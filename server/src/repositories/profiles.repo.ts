// File: server/src/repositories/profiles.repo.ts
// Purpose: Runs the database queries used for profiles.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

const ALLOWED_PROFILE_TABLES = ["student_profiles", "instructor_profiles", "admin_profiles"] as const;
const ALLOWED_PROFILE_SORT_COLUMNS = ["full_name", "created_at", "sort_order", "featured_rank", "updated_at"] as const;

type ProfileTableName = typeof ALLOWED_PROFILE_TABLES[number];
type ProfileSortColumn = typeof ALLOWED_PROFILE_SORT_COLUMNS[number];
type InstructorUserInput = {
  email?: string | null;
  phone?: string | null;
  password_hash?: string | null;
};
type InstructorProfilePayload = {
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  expertise?: string | null;
  skills?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  is_public?: boolean;
  sort_order?: number | null;
};

function assertValidProfileTableName(tableName: ProfileTableName): void {
  if (!(ALLOWED_PROFILE_TABLES as readonly string[]).includes(tableName)) {
    throw new Error(`Invalid profile table name: ${tableName}`);
  }
}

function assertValidProfileSortColumn(sortBy: ProfileSortColumn): void {
  if (!(ALLOWED_PROFILE_SORT_COLUMNS as readonly string[]).includes(sortBy)) {
    throw new Error(`Invalid profile sort column: ${sortBy}`);
  }
}

// Handles 'countProfiles' workflow for this module.
export async function countProfiles(
  tableName: ProfileTableName,
  whereClause: string,
  params: readonly unknown[],
  db: DbClient = pool,
) {
  assertValidProfileTableName(tableName);

  return db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM ${tableName} p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
    `,
    Array.from(params),
  );
}

// Handles 'listProfiles' workflow for this module.
export async function listProfiles(
  tableName: ProfileTableName,
  whereClause: string,
  sortBy: string,
  order: "asc" | "desc",
  params: readonly unknown[],
  limit: number,
  offset: number,
  db: DbClient = pool,
) {
  assertValidProfileTableName(tableName);
  assertValidProfileSortColumn(sortBy as ProfileSortColumn);

  return db.query(
    `
      SELECT p.*, u.email, u.phone, u.is_active
      FROM ${tableName} p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
      ORDER BY p.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...Array.from(params), limit, offset],
  );
}

// Handles 'updateProfile' workflow for this module.
export async function updateProfile(
  tableName: ProfileTableName,
  userId: number,
  setClause: string,
  values: readonly unknown[],
  db: DbClient = pool,
) {
  assertValidProfileTableName(tableName);

  return db.query(
    `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE user_id = $${values.length + 1}
      RETURNING *
    `,
    [...Array.from(values), userId],
  );
}

// Handles 'updateProfileVisibility' workflow for this module.
export async function updateProfileVisibility(
  tableName: ProfileTableName,
  userId: number,
  isPublic: boolean,
  db: DbClient = pool,
) {
  assertValidProfileTableName(tableName);

  return db.query(
    `
      UPDATE ${tableName}
      SET is_public = $1
      WHERE user_id = $2
      RETURNING *
    `,
    [isPublic, userId],
  );
}

// Handles 'createInstructorUser' workflow for this module.
export async function createInstructorUser(input: InstructorUserInput, db: DbClient = pool) {
  return db.query(
    `
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
    `,
    [input.email ?? null, input.phone ?? null, input.password_hash ?? null],
  );
}

// Handles 'createInstructorProfile' workflow for this module.
export async function createInstructorProfile(userId: number, payload: InstructorProfilePayload, db: DbClient = pool) {
  return db.query(
    `
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
    `,
    [
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
    ],
  );
}

// Handles 'getInstructorProfileByUserId' workflow for this module.
export async function getInstructorProfileByUserId(userId: number, db: DbClient = pool) {
  return db.query(
    `
      SELECT
        p.*,
        u.email,
        u.phone,
        u.is_active,
        u.is_instructor
      FROM instructor_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1
    `,
    [userId],
  );
}

// Handles 'setInstructorActiveByUserId' workflow for this module.
export async function setInstructorActiveByUserId(userId: number, isActive: boolean, db: DbClient = pool) {
  return db.query(
    `
      UPDATE users
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
        AND is_instructor = TRUE
      RETURNING id
    `,
    [isActive, userId],
  );
}
