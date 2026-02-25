// File Summary: server/src/services/profiles.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import { countProfiles, listProfiles, updateProfile, updateProfileVisibility, } from "../repositories/profiles.repo.js";
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


