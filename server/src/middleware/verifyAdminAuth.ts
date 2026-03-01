// File Summary: server/src/middleware/verifyAdminAuth.ts
// Layer: middleware
// Purpose: Applies cross-cutting request rules like auth, validation, and errors.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import jwt from "jsonwebtoken";
import { pool } from "../db/index.js";
import { AppError } from "../utils/appError.js";

function isTransientDatabaseError(error) {
    if (!error || typeof error !== "object") {
        return false;
    }
    const code = String(error.code || "").toUpperCase();
    const message = String(error.message || "").toLowerCase();
    return (code === "08P01" ||
        code === "08006" ||
        code === "08001" ||
        code === "57P01" ||
        code === "ETIMEDOUT" ||
        code === "ECONNRESET" ||
        code === "EPIPE" ||
        message.includes("authentication timed out") ||
        message.includes("connection terminated unexpectedly"));
}

async function queryAdminUserWithRetry(userId) {
    const queryText = `
        SELECT
          u.id,
          u.is_admin,
          u.is_active,
          COALESCE(ap.admin_role, 'admin') AS admin_role,
          COALESCE(ap.job_title, '') AS job_title
        FROM users u
        LEFT JOIN admin_profiles ap ON ap.user_id = u.id
        WHERE u.id = $1
      `;
    try {
        return await pool.query(queryText, [userId]);
    }
    catch (error) {
        if (!isTransientDatabaseError(error)) {
            throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
        return pool.query(queryText, [userId]);
    }
}
export async function verifyAdminAuth(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            throw new AppError(401, "UNAUTHORIZED", "Authentication required");
        }
        const token = authHeader.slice("Bearer ".length);
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new AppError(500, "INTERNAL_ERROR", "JWT_SECRET is not configured.");
        }
        let payload;
        try {
            payload = jwt.verify(token, secret);
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AppError(401, "TOKEN_EXPIRED", "Authentication token has expired.");
            }
            throw new AppError(401, "TOKEN_INVALID", "Invalid authentication token.");
        }
        if (!payload.userId) {
            throw new AppError(401, "TOKEN_INVALID", "Invalid authentication token.");
        }
        let userResult;
        try {
            userResult = await queryAdminUserWithRetry(payload.userId);
        }
        catch (error) {
            if (isTransientDatabaseError(error)) {
                throw new AppError(503, "DB_UNAVAILABLE", "Database connection is temporarily unavailable. Please try again.");
            }
            throw error;
        }
        if (!userResult.rowCount) {
            throw new AppError(401, "USER_NOT_FOUND", "User not found.");
        }
        const user = userResult.rows[0];
        if (!user.is_active) {
            throw new AppError(401, "USER_INACTIVE", "User account is inactive.");
        }
        if (!user.is_admin || !payload.isAdmin) {
            throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action");
        }
        const normalizedJobTitle = String(user.job_title || "").trim().toLowerCase();
        const roleFromProfile = user.admin_role === "super_admin" ? "super_admin" : "admin";
        const roleFromJobTitle = normalizedJobTitle.includes("super admin") ? "super_admin" : "admin";
        req.user = {
            id: user.id,
            isAdmin: true,
            role: roleFromProfile === "super_admin" || roleFromJobTitle === "super_admin" ? "super_admin" : "admin",
        };
        next();
    }
    catch (error) {
        next(error);
    }
}


