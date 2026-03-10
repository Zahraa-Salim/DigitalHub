// File: server/src/services/auth.service.ts
// Purpose: Implements the business rules for auth.
// It coordinates validation, data access, and side effects before results go back to controllers.


import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import { pool } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause } from "../utils/sql.js";
import { buildUpdateQuery } from "../utils/sql.js";
import { sendDigitalHubEmail } from "../utils/mailer.js";
import { sendDigitalHubWhatsApp } from "../utils/whatsapp.js";
import { findActiveAdminByEmail, findAdminProfileByUserId, getUserPasswordHash, listAdminProfiles, updateLastLogin, updateUserAccount, updateUserPasswordHash, upsertAdminProfile, } from "../repositories/auth.repo.js";
import { countUsersForMessaging, listUsersForMessaging } from "../repositories/auth.repo.js";
import { findUsersForMessagingByIds } from "../repositories/auth.repo.js";
import { clearUserPasswordResetToken, findUserByEmailForPasswordReset, findUserByPasswordResetToken, setUserPasswordResetToken } from "../repositories/auth.repo.js";

type ActorRole = "admin" | "super_admin";
type AuthLoginInput = {
    email: string;
    password: string;
};
type ForgotPasswordInput = {
    email?: string | null;
};
type ResetPasswordInput = {
    password?: string | null;
};
type AdminProfilePayload = Record<string, any>;
type ListQuery = Record<string, any>;
type MessagingUsersPayload = {
    channel: "email" | "sms";
    user_ids?: Array<number | string>;
    subject?: string;
    body?: string;
};
// Handles 'loginAdmin' workflow for this module.
export async function loginAdmin(input: AuthLoginInput) {
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
    const expiresIn = (process.env.JWT_EXPIRES_IN || "8h") as SignOptions["expiresIn"];
    if (!secret) {
        throw new AppError(500, "INTERNAL_ERROR", "JWT_SECRET is not configured.");
    }
    const token = jwt.sign({
        userId: user.id,
        isAdmin: true,
    }, secret as Secret, { expiresIn });
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

// Handles 'hashResetToken' workflow for this module.
function hashResetToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

// Handles 'isDevForgotAnyEmailEnabled' workflow for this module.
function isDevForgotAnyEmailEnabled() {
    if (process.env.NODE_ENV === "production") {
        return false;
    }
    const raw = String(process.env.AUTH_FORGOT_ALLOW_ANY_EMAIL ?? "true").trim().toLowerCase();
    return !["0", "false", "no", "off"].includes(raw);
}

// Handles 'isDevResetDebugEnabled' workflow for this module.
function isDevResetDebugEnabled() {
    if (process.env.NODE_ENV === "production") {
        return false;
    }
    const raw = String(process.env.AUTH_DEBUG_RETURN_RESET_TOKEN ?? "true").trim().toLowerCase();
    return !["0", "false", "no", "off"].includes(raw);
}

// Handles 'getPasswordResetBaseUrl' workflow for this module.
function getPasswordResetBaseUrl() {
    return (process.env.PASSWORD_RESET_URL_BASE ||
        process.env.DASHBOARD_URL ||
        process.env.FRONTEND_URL ||
        "http://localhost:5174").replace(/\/$/, "");
}

// Handles 'forgotPasswordService' workflow for this module.
export async function forgotPasswordService(input: ForgotPasswordInput) {
    const email = String(input.email || "").trim().toLowerCase();
    const genericMessage = "If that email exists, a reset link has been sent.";
    if (!email) {
        return { message: genericMessage };
    }
    const devAnyEmailMode = isDevForgotAnyEmailEnabled();
    const userResult = await findUserByEmailForPasswordReset(email);
    const user = userResult.rowCount ? userResult.rows[0] : null;
    const canStoreTokenForUser = Boolean(user && user.is_active);

    if (!canStoreTokenForUser && !devAnyEmailMode) {
        return { message: genericMessage };
    }
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    if (canStoreTokenForUser) {
        const tokenHash = hashResetToken(rawToken);
        await setUserPasswordResetToken(user.id, tokenHash, expiresAt);
    }
    const baseUrl = getPasswordResetBaseUrl();
    const resetLink = `${baseUrl}/reset-password/${rawToken}`;
    await sendDigitalHubEmail({
        to: email,
        subject: "Reset your password",
        body: `We received a password reset request for your account.\n\nReset your password: ${resetLink}\n\nThis link expires in 1 hour.\nIf you did not request this, you can ignore this email.`,
    });
    if (isDevResetDebugEnabled()) {
        return {
            message: genericMessage,
            debug: {
                reset_token: rawToken,
                reset_link: resetLink,
                expires_at: expiresAt.toISOString(),
                delivered_to: email,
                user_exists: canStoreTokenForUser,
            },
        };
    }
    return { message: genericMessage };
}

// Handles 'resetPasswordService' workflow for this module.
export async function resetPasswordService(token: string, input: ResetPasswordInput) {
    const rawToken = String(token || "").trim();
    if (!rawToken) {
        throw new AppError(400, "INVALID_TOKEN", "Reset token is invalid or expired.");
    }
    const password = String(input.password || "");
    if (password.length < 8) {
        throw new AppError(400, "VALIDATION_ERROR", "Password must be at least 8 characters.");
    }
    const tokenHash = hashResetToken(rawToken);
    const userResult = await findUserByPasswordResetToken(tokenHash);
    if (!userResult.rowCount) {
        throw new AppError(400, "INVALID_TOKEN", "Reset token is invalid or expired.");
    }
    const user = userResult.rows[0];
    const passwordHash = await bcrypt.hash(password, 10);
    await updateUserPasswordHash(user.id, passwordHash);
    await clearUserPasswordResetToken(user.id);
    return { message: "Password reset successful." };
}
// Handles 'getMyAdminProfile' workflow for this module.
export async function getMyAdminProfile(userId: number) {
    const result = await findAdminProfileByUserId(userId);
    if (!result.rowCount) {
        throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
    }
    return result.rows[0];
}
// Handles 'updateMyAdminProfile' workflow for this module.
export async function updateMyAdminProfile(userId: number, payload: AdminProfilePayload) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existingResult = await findAdminProfileByUserId(userId, client);
        if (!existingResult.rowCount) {
            throw new AppError(404, "USER_NOT_FOUND", "Admin user not found.");
        }
        const existing = existingResult.rows[0];
        const normalizedPayload: AdminProfilePayload = {
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
        const userUpdates: { email?: string; phone?: string | null } = {};
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
            is_public: normalizedPayload.is_public !== undefined ? normalizedPayload.is_public : (existing.is_public ?? true),
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
// Handles 'listAllAdmins' workflow for this module.
export async function listAllAdmins(actorRole: ActorRole) {
    if (actorRole !== "admin" && actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action.");
    }
    const result = await listAdminProfiles();
    return result.rows;
}
// Handles 'updateAdminBySuperAdmin' workflow for this module.
export async function updateAdminBySuperAdmin(actorUserId: number, actorRole: ActorRole, targetUserId: number, payload: AdminProfilePayload) {
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
        const normalizedPayload: AdminProfilePayload = {
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
        const userUpdates: { email?: string; phone?: string | null; is_active?: boolean } = {};
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

const USER_SORT_COLUMN_MAP: Record<string, string> = {
    full_name: "COALESCE(NULLIF(ap.full_name, ''), NULLIF(ip.full_name, ''), NULLIF(sp.full_name, ''), NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''), 'User')",
    email: "COALESCE(u.email, '')",
    created_at: "u.created_at",
};

// Handles 'listUsersForMessagingService' workflow for this module.
export async function listUsersForMessagingService(actorRole: ActorRole, query: ListQuery) {
    if (actorRole !== "admin" && actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action.");
    }

    const list = parseListQuery(query, ["full_name", "email", "created_at"], "full_name");
    const sortColumn = USER_SORT_COLUMN_MAP[list.sortBy] ?? USER_SORT_COLUMN_MAP.full_name;
    const params: Array<string | number | boolean> = [];
    const where: string[] = ["u.is_active = TRUE"];

    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause([
            "COALESCE(u.email, '')",
            "COALESCE(u.phone, '')",
            "COALESCE(ap.full_name, '')",
            "COALESCE(ip.full_name, '')",
            "COALESCE(sp.full_name, '')",
        ], params.length));
    }

    const whereClause = `WHERE ${where.join(" AND ")}`;
    const countResult = await countUsersForMessaging(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listUsersForMessaging(whereClause, sortColumn, list.order, params, list.limit, list.offset);

    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}

// Handles 'sendMessagingUsersService' workflow for this module.
export async function sendMessagingUsersService(actorUserId: number, actorRole: ActorRole, payload: MessagingUsersPayload) {
    if (actorRole !== "admin" && actorRole !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action.");
    }

    const rawIds = Array.isArray(payload.user_ids) ? payload.user_ids : [];
    const uniqueIds = [...new Set(rawIds.map((id: number | string) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0))];
    if (!uniqueIds.length) {
        throw new AppError(400, "VALIDATION_ERROR", "At least one recipient user is required.");
    }

    const usersResult = await findUsersForMessagingByIds(uniqueIds);
    const users = usersResult.rows;
    if (!users.length) {
        throw new AppError(404, "USERS_NOT_FOUND", "No active users found for the selected recipients.");
    }

    const body = String(payload.body || "").trim();
    const subject = payload.channel === "email"
        ? String(payload.subject || "").trim() || "Digital Hub Message"
        : "";

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const skippedUsers: Array<Record<string, unknown>> = [];
    const failedUsers: Array<Record<string, unknown>> = [];

    for (const user of users) {
        if (payload.channel === "email") {
            const toValue = String(user.email || "").trim();
            if (!toValue) {
                skippedCount += 1;
                skippedUsers.push({
                    id: user.id,
                    reason: "missing_email",
                });
                continue;
            }
            try {
                await sendDigitalHubEmail({
                    to: toValue,
                    subject,
                    body,
                });
                sentCount += 1;
            }
            catch (error: any) {
                failedCount += 1;
                failedUsers.push({
                    id: user.id,
                    reason: "send_failed",
                    error: String(error?.message || error),
                });
            }
            continue;
        }

        const phone = String(user.phone || "").trim();
        if (!phone) {
            skippedCount += 1;
            skippedUsers.push({
                id: user.id,
                reason: "missing_phone",
            });
            continue;
        }
        try {
            await sendDigitalHubWhatsApp({
                to: phone,
                body,
            });
            sentCount += 1;
        }
        catch (error: any) {
            failedCount += 1;
            failedUsers.push({
                id: user.id,
                reason: "send_failed",
                error: String(error?.message || error),
            });
        }
    }

    await logAdminAction({
        actorUserId,
        action: "send messaging users",
        entityType: "users",
        entityId: null,
        message: `User broadcast sent via ${payload.channel}.`,
        metadata: {
            channel: payload.channel,
            requested_user_ids: uniqueIds,
            sent_count: sentCount,
            skipped_count: skippedCount,
            failed_count: failedCount,
            skipped_users: skippedUsers,
            failed_users: failedUsers,
        },
        title: "User Message Sent",
        body: `${sentCount} ${payload.channel.toUpperCase()} message(s) sent${skippedCount ? `, ${skippedCount} skipped` : ""}${failedCount ? `${skippedCount ? "," : ""} ${failedCount} failed` : ""}.`,
    });

    return {
        channel: payload.channel,
        requested_count: uniqueIds.length,
        sent_count: sentCount,
        skipped_count: skippedCount,
        failed_count: failedCount,
        skipped_users: skippedUsers,
        failed_users: failedUsers,
    };
}

