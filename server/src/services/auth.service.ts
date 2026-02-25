// File Summary: server/src/services/auth.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildUpdateQuery } from "../utils/sql.js";
import { findActiveAdminByEmail, findAdminProfileByUserId, getUserPasswordHash, listAdminProfiles, updateLastLogin, updateUserAccount, updateUserPasswordHash, upsertAdminProfile, } from "../repositories/auth.repo.js";
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
    return result.rows[0];
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
            ...payload,
            phone: payload.phone === "" ? null : payload.phone,
            avatar_url: payload.avatar_url === "" ? null : payload.avatar_url,
            linkedin_url: payload.linkedin_url === "" ? null : payload.linkedin_url,
            github_url: payload.github_url === "" ? null : payload.github_url,
            portfolio_url: payload.portfolio_url === "" ? null : payload.portfolio_url,
            bio: payload.bio === "" ? null : payload.bio,
            job_title: payload.job_title === "" ? null : payload.job_title,
        };
        const wantsPasswordChange =
            typeof normalizedPayload.current_password === "string" &&
                typeof normalizedPayload.new_password === "string";
        if (wantsPasswordChange) {
            const passwordResult = await getUserPasswordHash(userId, client);
            if (!passwordResult.rowCount) {
                throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
            }
            const validCurrentPassword = await bcrypt.compare(normalizedPayload.current_password, passwordResult.rows[0].password_hash);
            if (!validCurrentPassword) {
                throw new AppError(400, "PASSWORD_INVALID", "Current password is incorrect.");
            }
            const newPasswordHash = await bcrypt.hash(normalizedPayload.new_password, 10);
            await updateUserPasswordHash(userId, newPasswordHash, client);
        }
        const userUpdates = {};
        if (normalizedPayload.email !== undefined) {
            userUpdates.email = normalizedPayload.email;
        }
        if (normalizedPayload.phone !== undefined) {
            userUpdates.phone = normalizedPayload.phone;
        }
        if (Object.keys(userUpdates).length > 0) {
            const { setClause, values } = buildUpdateQuery(userUpdates, ["email", "phone"], 1);
            await updateUserAccount(userId, setClause, values, client);
        }
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
                updated_fields: Object.keys(normalizedPayload).filter((field) => field !== "current_password" && field !== "new_password"),
                password_changed: wantsPasswordChange,
            },
        }, client);
        await client.query("COMMIT");
        return refreshedResult.rows[0];
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
    if (actorRole !== "admin" && actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action.");
    }
    const result = await listAdminProfiles();
    return result.rows;
}
export async function updateAdminBySuperAdmin(actorUserId, actorRole, targetUserId, payload) {
    if (actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "Only super admin can edit other admin accounts.");
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
        return refreshedResult.rows[0];
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}


