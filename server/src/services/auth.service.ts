// File Summary: server/src/services/auth.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs/promises";
import jwt from "jsonwebtoken";
import path from "path";
import { pool } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildUpdateQuery } from "../utils/sql.js";
import { createAdminUser, deleteAdminUser, findActiveAdminByEmail, findAdminProfileByUserId, findUserByEmailOrPhone, getUserPasswordHash, listAdminProfiles, updateLastLogin, updateUserAccount, updateUserPasswordHash, upsertAdminProfile, } from "../repositories/auth.repo.js";
const AVATAR_EXT_BY_MIME = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
function toAdminProfileResponse(row) {
    return {
        id: row.id,
        email: row.email ?? null,
        phone: row.phone ?? null,
        is_active: Boolean(row.is_active),
        full_name: row.full_name ?? "Admin",
        admin_role: row.admin_role === "super_admin" ? "super_admin" : "admin",
        avatar_url: row.avatar_url ?? null,
        bio: row.bio ?? null,
        job_title: row.job_title ?? null,
        linkedin_url: row.linkedin_url ?? null,
        github_url: row.github_url ?? null,
        portfolio_url: row.portfolio_url ?? null,
    };
}
export async function loginAdmin(input) {
    const userResult = await findActiveAdminByEmail(input.email.toLowerCase());
    if (!userResult.rowCount) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials.");
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!isMatch) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials.");
    }
    const secret = process.env.JWT_SECRET;
    const expiresIn = (process.env.JWT_EXPIRES_IN || "8h");
    if (!secret) {
        throw new AppError(500, "INTERNAL_ERROR", "JWT_SECRET is not configured.");
    }
    const token = jwt.sign({
        userId: user.id,
        isAdmin: true,
    }, secret, { expiresIn });
    await updateLastLogin(user.id);
    await logAdminAction({
        actorUserId: user.id,
        action: "login",
        entityType: "auth",
        entityId: user.id,
        message: `Admin ${user.email} logged in.`,
        metadata: {
            email: user.email,
        },
        title: "Admin Login",
        body: `${user.email} signed in to the dashboard.`,
    });
    return {
        token,
        expiresIn,
        user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            admin_role: user.admin_role ?? "admin",
        },
    };
}
export async function getMyAdminProfile(userId) {
    const result = await findAdminProfileByUserId(userId);
    if (!result.rowCount) {
        throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
    }
    return toAdminProfileResponse(result.rows[0]);
}
export async function updateMyAdminProfile(userId, payload) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existingResult = await findAdminProfileByUserId(userId, client);
        if (!existingResult.rowCount) {
            throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
        }
        const existing = existingResult.rows[0];
        const normalizedPayload = {
            full_name: payload.full_name,
            avatar_url: payload.avatar_url === "" ? null : payload.avatar_url,
            linkedin_url: payload.linkedin_url === "" ? null : payload.linkedin_url,
            github_url: payload.github_url === "" ? null : payload.github_url,
            portfolio_url: payload.portfolio_url === "" ? null : payload.portfolio_url,
            bio: payload.bio === "" ? null : payload.bio,
            job_title: payload.job_title === "" ? null : payload.job_title,
        };
        const profileUpdates = {
            full_name: normalizedPayload.full_name ?? existing.full_name ?? "Admin",
            avatar_url: normalizedPayload.avatar_url !== undefined ? normalizedPayload.avatar_url : (existing.avatar_url ?? null),
            bio: normalizedPayload.bio !== undefined ? normalizedPayload.bio : (existing.bio ?? null),
            job_title: normalizedPayload.job_title !== undefined ? normalizedPayload.job_title : (existing.job_title ?? null),
            linkedin_url: normalizedPayload.linkedin_url !== undefined ? normalizedPayload.linkedin_url : (existing.linkedin_url ?? null),
            github_url: normalizedPayload.github_url !== undefined ? normalizedPayload.github_url : (existing.github_url ?? null),
            portfolio_url: normalizedPayload.portfolio_url !== undefined ? normalizedPayload.portfolio_url : (existing.portfolio_url ?? null),
            admin_role: existing.admin_role ?? "admin",
            is_public: existing.is_public ?? true,
            sort_order: existing.sort_order ?? 0,
        };
        await upsertAdminProfile(userId, profileUpdates, client);
        const refreshedResult = await findAdminProfileByUserId(userId, client);
        await logAdminAction({
            actorUserId: userId,
            action: "update my profile",
            entityType: "admin_profiles",
            entityId: userId,
            message: `Admin user ${userId} updated their profile.`,
            metadata: {
                updated_fields: Object.keys(normalizedPayload),
            },
        }, client);
        await client.query("COMMIT");
        return toAdminProfileResponse(refreshedResult.rows[0]);
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
export async function listAllAdmins(actorRole) {
    if (actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action.");
    }
    const result = await listAdminProfiles();
    return result.rows.map(toAdminProfileResponse);
}
export async function getAdminProfileBySuperAdmin(actorRole, targetUserId) {
    if (actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "Only super admin can access admin management data.");
    }
    const result = await findAdminProfileByUserId(targetUserId);
    if (!result.rowCount) {
        throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
    }
    return toAdminProfileResponse(result.rows[0]);
}
export async function createAdminBySuperAdmin(actorUserId, actorRole, payload) {
    if (actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "Only super admin can create admin accounts.");
    }
    const normalizedPayload = {
        ...payload,
        email: payload.email === "" ? null : payload.email?.toLowerCase(),
        phone: payload.phone === "" ? null : payload.phone,
        avatar_url: payload.avatar_url === "" ? null : payload.avatar_url,
        linkedin_url: payload.linkedin_url === "" ? null : payload.linkedin_url,
        github_url: payload.github_url === "" ? null : payload.github_url,
        portfolio_url: payload.portfolio_url === "" ? null : payload.portfolio_url,
        bio: payload.bio === "" ? null : payload.bio,
        job_title: payload.job_title === "" ? null : payload.job_title,
    };
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const duplicateResult = await findUserByEmailOrPhone(normalizedPayload.email, normalizedPayload.phone, client);
        if (duplicateResult.rowCount) {
            throw new AppError(409, "USER_EXISTS", "An account with this email or phone already exists.");
        }
        const passwordHash = await bcrypt.hash(normalizedPayload.password, 10);
        const userInsertResult = await createAdminUser({
            email: normalizedPayload.email,
            phone: normalizedPayload.phone,
            password_hash: passwordHash,
            is_active: normalizedPayload.is_active ?? true,
        }, client);
        const createdUserId = userInsertResult.rows[0].id;
        await upsertAdminProfile(createdUserId, {
            full_name: normalizedPayload.full_name,
            avatar_url: normalizedPayload.avatar_url ?? null,
            bio: normalizedPayload.bio ?? null,
            job_title: normalizedPayload.job_title ?? null,
            linkedin_url: normalizedPayload.linkedin_url ?? null,
            github_url: normalizedPayload.github_url ?? null,
            portfolio_url: normalizedPayload.portfolio_url ?? null,
            admin_role: normalizedPayload.admin_role ?? "admin",
            is_public: true,
            sort_order: 0,
        }, client);
        const refreshed = await findAdminProfileByUserId(createdUserId, client);
        await logAdminAction({
            actorUserId,
            action: "create admin account",
            entityType: "admin_profiles",
            entityId: createdUserId,
            message: `Super admin ${actorUserId} created admin account ${createdUserId}.`,
            metadata: {
                email: normalizedPayload.email,
                phone: normalizedPayload.phone,
                admin_role: normalizedPayload.admin_role ?? "admin",
            },
        }, client);
        await client.query("COMMIT");
        return toAdminProfileResponse(refreshed.rows[0]);
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
export async function updateAdminBySuperAdmin(actorUserId, actorRole, targetUserId, payload) {
    if (actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "Only super admin can edit other admin accounts.");
    }
    if (actorUserId === targetUserId && payload.admin_role && payload.admin_role !== "super_admin") {
        throw new AppError(400, "INVALID_OPERATION", "Super admin cannot demote themselves.");
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existingResult = await findAdminProfileByUserId(targetUserId, client);
        if (!existingResult.rowCount) {
            throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
        }
        const existing = existingResult.rows[0];
        const normalizedPayload = {
            ...payload,
            email: payload.email === "" ? null : payload.email?.toLowerCase(),
            phone: payload.phone === "" ? null : payload.phone,
            avatar_url: payload.avatar_url === "" ? null : payload.avatar_url,
            linkedin_url: payload.linkedin_url === "" ? null : payload.linkedin_url,
            github_url: payload.github_url === "" ? null : payload.github_url,
            portfolio_url: payload.portfolio_url === "" ? null : payload.portfolio_url,
            bio: payload.bio === "" ? null : payload.bio,
            job_title: payload.job_title === "" ? null : payload.job_title,
        };
        if (typeof normalizedPayload.new_password === "string") {
            const newPasswordHash = await bcrypt.hash(normalizedPayload.new_password, 10);
            await updateUserPasswordHash(targetUserId, newPasswordHash, client);
        }
        if (normalizedPayload.email || normalizedPayload.phone) {
            const duplicateResult = await findUserByEmailOrPhone(normalizedPayload.email, normalizedPayload.phone, client);
            const duplicate = duplicateResult.rows[0];
            if (duplicate && Number(duplicate.id) !== targetUserId) {
                throw new AppError(409, "USER_EXISTS", "An account with this email or phone already exists.");
            }
        }
        const userUpdates = {};
        if (normalizedPayload.email !== undefined) {
            userUpdates.email = normalizedPayload.email;
        }
        if (normalizedPayload.phone !== undefined) {
            userUpdates.phone = normalizedPayload.phone;
        }
        if (normalizedPayload.is_active !== undefined) {
            userUpdates.is_active = normalizedPayload.is_active;
        }
        if (Object.keys(userUpdates).length > 0) {
            const { setClause, values } = buildUpdateQuery(userUpdates, ["email", "phone", "is_active"], 1);
            await updateUserAccount(targetUserId, setClause, values, client);
        }
        const profileUpdates = {
            full_name: normalizedPayload.full_name ?? existing.full_name ?? "Admin",
            avatar_url: normalizedPayload.avatar_url !== undefined ? normalizedPayload.avatar_url : (existing.avatar_url ?? null),
            bio: normalizedPayload.bio !== undefined ? normalizedPayload.bio : (existing.bio ?? null),
            job_title: normalizedPayload.job_title !== undefined ? normalizedPayload.job_title : (existing.job_title ?? null),
            linkedin_url: normalizedPayload.linkedin_url !== undefined ? normalizedPayload.linkedin_url : (existing.linkedin_url ?? null),
            github_url: normalizedPayload.github_url !== undefined ? normalizedPayload.github_url : (existing.github_url ?? null),
            portfolio_url: normalizedPayload.portfolio_url !== undefined ? normalizedPayload.portfolio_url : (existing.portfolio_url ?? null),
            admin_role: normalizedPayload.admin_role ?? existing.admin_role ?? "admin",
            is_public: normalizedPayload.is_public ?? existing.is_public ?? true,
            sort_order: normalizedPayload.sort_order ?? existing.sort_order ?? 0,
        };
        await upsertAdminProfile(targetUserId, profileUpdates, client);
        const refreshedResult = await findAdminProfileByUserId(targetUserId, client);
        await logAdminAction({
            actorUserId,
            action: "update admin account",
            entityType: "admin_profiles",
            entityId: targetUserId,
            message: `Super admin ${actorUserId} updated admin account ${targetUserId}.`,
            metadata: {
                updated_fields: Object.keys(normalizedPayload).filter((field) => field !== "new_password"),
                password_changed: typeof normalizedPayload.new_password === "string",
            },
        }, client);
        await client.query("COMMIT");
        return toAdminProfileResponse(refreshedResult.rows[0]);
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
export async function deleteAdminBySuperAdmin(actorUserId, actorRole, targetUserId) {
    if (actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "Only super admin can delete admin accounts.");
    }
    if (actorUserId === targetUserId) {
        throw new AppError(400, "INVALID_OPERATION", "Super admin cannot delete their own account.");
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existingResult = await findAdminProfileByUserId(targetUserId, client);
        if (!existingResult.rowCount) {
            throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
        }
        await deleteAdminUser(targetUserId, client);
        await logAdminAction({
            actorUserId,
            action: "delete admin account",
            entityType: "admin_profiles",
            entityId: targetUserId,
            message: `Super admin ${actorUserId} deleted admin account ${targetUserId}.`,
        }, client);
        await client.query("COMMIT");
        return { deleted: true };
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}
export async function uploadMyAdminAvatar(userId, payload) {
    const existingResult = await findAdminProfileByUserId(userId);
    if (!existingResult.rowCount) {
        throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
    }
    const fileBuffer = Buffer.from(payload.data_base64, "base64");
    if (!fileBuffer.length) {
        throw new AppError(400, "INVALID_IMAGE", "Avatar file is empty.");
    }
    if (fileBuffer.length > MAX_AVATAR_BYTES) {
        throw new AppError(400, "IMAGE_TOO_LARGE", "Avatar must be 2MB or smaller.");
    }
    const extension = AVATAR_EXT_BY_MIME[payload.mime_type];
    if (!extension) {
        throw new AppError(400, "INVALID_IMAGE_TYPE", "Only JPG, PNG, and WEBP avatars are supported.");
    }
    const safeFileName = payload.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    const uniqueId = crypto.randomUUID();
    const fileName = `${userId}-${Date.now()}-${uniqueId}-${safeFileName}.${extension}`;
    const relativePath = path.posix.join("avatars", fileName);
    const uploadsRoot = path.resolve(process.cwd(), "uploads");
    const targetDir = path.join(uploadsRoot, "avatars");
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, fileName), fileBuffer);
    const avatarUrl = `/${path.posix.join("uploads", relativePath)}`;
    await updateMyAdminProfile(userId, { avatar_url: avatarUrl });
    return { avatar_url: avatarUrl };
}


