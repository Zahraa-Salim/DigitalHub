// File Summary: server/src/services/profiles.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import { countProfiles, listProfiles, updateProfile, updateProfileVisibility, } from "../repositories/profiles.repo.js";
import {
  getPublicStudentProfileBySlug,
  getPublicStudentProjects,
  getStudentProfileWithUser,
  getStudentProjects,
  isPublicSlugUnique,
  updateStudentProfile,
  getUserById,
} from "../repositories/profiles.repository.js";
function ensureAdminProfilePermission(tableName, actorUserId, actorRole, targetUserId, payload) {
    if (tableName !== "admin_profiles") {
        return;
    }
    const isSuperAdmin = actorRole === "super_admin";
    const isSelfUpdate = actorUserId === targetUserId;
    if (!isSuperAdmin && !isSelfUpdate) {
        throw new AppError(403, "FORBIDDEN", "Admin users can edit only their own account.");
    }
    if (!isSuperAdmin && payload) {
        if ("admin_role" in payload || "sort_order" in payload) {
            throw new AppError(403, "FORBIDDEN", "Only super admin can update admin role or sort order.");
        }
    }
}
export async function listProfilesService(tableName, sortColumns, query) {
    const list = parseListQuery(query, sortColumns, "created_at");
    const params = [];
    const where = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["p.full_name", "COALESCE(p.bio, '')"], params.length));
    }
    if (list.isPublic !== undefined) {
        params.push(list.isPublic);
        where.push(`p.is_public = $${params.length}`);
    }
    if (list.featured !== undefined && tableName === "student_profiles") {
        params.push(list.featured);
        where.push(`p.featured = $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countProfiles(tableName, whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listProfiles(tableName, whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
export async function patchProfileService(tableName, allowedUpdates, userId, adminId, actorRole, payload) {
    ensureAdminProfilePermission(tableName, adminId, actorRole, userId, payload);
    const { setClause, values } = buildUpdateQuery(payload, allowedUpdates, 1);
    const result = await updateProfile(tableName, userId, setClause, values);
    if (!result.rowCount) {
        throw new AppError(404, "USER_NOT_FOUND", "Profile not found.");
    }
    await logAdminAction({
        actorUserId: adminId,
        action: "update profile",
        entityType: tableName,
        entityId: userId,
        message: `${tableName} profile for user ${userId} was updated.`,
        metadata: { updated_fields: Object.keys(payload) },
    });
    return result.rows[0];
}
export async function patchProfileVisibilityService(tableName, userId, adminId, actorRole, isPublic) {
    ensureAdminProfilePermission(tableName, adminId, actorRole, userId);
    const result = await updateProfileVisibility(tableName, userId, isPublic);
    if (!result.rowCount) {
        throw new AppError(404, "USER_NOT_FOUND", "Profile not found.");
    }
    await logAdminAction({
        actorUserId: adminId,
        action: "profile visibility change",
        entityType: tableName,
        entityId: userId,
        message: `${tableName} visibility for user ${userId} changed to ${isPublic}.`,
        metadata: {
            is_public: isPublic,
        },
        title: "Profile Visibility Updated",
        body: `Visibility for ${tableName} user #${userId} changed to ${isPublic}.`,
    });
    return result.rows[0];
}


// ===================================
// STUDENT PROFILE FUNCTIONS
// ===================================

/**
 * Transform database row to API response format
 */
function toStudentProfileResponse(userRow, profileRow, projects) {
  return {
    user: {
      id: userRow.id,
      email: userRow.email ?? null,
      phone: userRow.phone ?? null,
      is_student: Boolean(userRow.is_student),
      is_instructor: Boolean(userRow.is_instructor),
      is_admin: Boolean(userRow.is_admin),
    },
    profile: {
      full_name: profileRow.full_name ?? null,
      avatar_url: profileRow.avatar_url ?? null,
      bio: profileRow.bio ?? null,
      linkedin_url: profileRow.linkedin_url ?? null,
      github_url: profileRow.github_url ?? null,
      portfolio_url: profileRow.portfolio_url ?? null,
      is_public: Boolean(profileRow.is_public),
      featured: Boolean(profileRow.featured),
      featured_rank: profileRow.featured_rank ?? null,
      public_slug: profileRow.public_slug ?? null,
      is_graduated: Boolean(profileRow.is_graduated),
      is_working: Boolean(profileRow.is_working),
      open_to_work: Boolean(profileRow.open_to_work),
      company_work_for: profileRow.company_work_for ?? null,
    },
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? null,
      image_url: p.image_url ?? null,
      github_url: p.github_url ?? null,
      live_url: p.live_url ?? null,
      is_public: Boolean(p.is_public),
    })),
  };
}

/**
 * Transform profile row to public response format
 */
function toPublicStudentProfileResponse(profileRow, projects) {
  return {
    profile: {
      full_name: profileRow.full_name ?? null,
      avatar_url: profileRow.avatar_url ?? null,
      bio: profileRow.bio ?? null,
      linkedin_url: profileRow.linkedin_url ?? null,
      github_url: profileRow.github_url ?? null,
      portfolio_url: profileRow.portfolio_url ?? null,
      is_graduated: Boolean(profileRow.is_graduated),
      is_working: Boolean(profileRow.is_working),
      open_to_work: Boolean(profileRow.open_to_work),
      company_work_for: profileRow.company_work_for ?? null,
      featured: Boolean(profileRow.featured),
    },
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? null,
      image_url: p.image_url ?? null,
      github_url: p.github_url ?? null,
      live_url: p.live_url ?? null,
    })),
  };
}

/**
 * GET /profiles/students/:userId
 * Fetch student profile with user data and projects
 * Returns: { user, profile, projects }
 */
export async function getStudentProfile(userId) {
  if (!userId) {
    throw new AppError(400, "INVALID_REQUEST", "User ID is required.");
  }

  // Fetch user + profile
  const userResult = await getStudentProfileWithUser(userId);
  if (!userResult.rowCount) {
    throw new AppError(404, "PROFILE_NOT_FOUND", "Student profile not found.");
  }

  // Fetch projects
  const projectsResult = await getStudentProjects(userId);
  const projects = projectsResult.rows || [];

  const userRow = userResult.rows[0];
  return toStudentProfileResponse(userRow, userRow, projects);
}

/**
 * GET /public/students/:public_slug
 * Fetch public student profile
 * Returns: { profile, projects }
 */
export async function getPublicStudentProfile(publicSlug) {
  if (!publicSlug) {
    throw new AppError(400, "INVALID_REQUEST", "Public slug is required.");
  }

  // Fetch profile by slug
  const profileResult = await getPublicStudentProfileBySlug(publicSlug);
  if (!profileResult.rowCount) {
    throw new AppError(404, "PROFILE_NOT_FOUND", "Public profile not found.");
  }

  const profileRow = profileResult.rows[0];

  // Fetch public projects
  const projectsResult = await getPublicStudentProjects(profileRow.user_id);
  const projects = projectsResult.rows || [];

  return toPublicStudentProfileResponse(profileRow, projects);
}

/**
 * PATCH /profiles/students/:userId
 * Update student profile with transaction support
 * - Validates slug uniqueness
 * - Logs admin action
 * - Returns updated profile
 */
export async function updateStudentProfileAdmin(adminUserId, targetUserId, payload) {
  if (!targetUserId) {
    throw new AppError(400, "INVALID_REQUEST", "User ID is required.");
  }

  // Check if target user exists
  const userResult = await getUserById(targetUserId);
  if (!userResult.rowCount) {
    throw new AppError(404, "USER_NOT_FOUND", "Student user not found.");
  }

  // Validate slug uniqueness if provided
  if (payload.public_slug !== undefined && payload.public_slug) {
    const slugResult = await isPublicSlugUnique(payload.public_slug, targetUserId);
    if (slugResult.rows[0].count > 0) {
      throw new AppError(409, "DUPLICATE_SLUG", "This public slug is already taken.");
    }
  }

  // Start transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update profile (without empty strings being treated as updates)
    const normalizedPayload = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        normalizedPayload[key] = value === "" ? null : value;
      }
    });

    // Perform update
    const updateResult = await updateStudentProfile(targetUserId, normalizedPayload, client);
    if (!updateResult || !updateResult.rowCount) {
      throw new AppError(404, "PROFILE_NOT_FOUND", "Student profile not found.");
    }

    const updatedProfile = updateResult.rows[0];

    // Log admin action
    await logAdminAction(
      {
        actorUserId: adminUserId,
        action: "update student profile",
        entityType: "student_profiles",
        entityId: targetUserId,
        message: `Admin updated student profile for user ${targetUserId}.`,
        metadata: {
          updated_fields: Object.keys(normalizedPayload),
        },
      },
      client
    );

    await client.query("COMMIT");

    // Fetch fresh profile with projects
    const freshResult = await getStudentProfileWithUser(targetUserId);
    const projectsResult = await getStudentProjects(targetUserId);
    const projects = projectsResult.rows || [];

    const freshRow = freshResult.rows[0];
    return toStudentProfileResponse(freshRow, freshRow, projects);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


