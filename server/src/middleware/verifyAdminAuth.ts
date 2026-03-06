// File Summary: server/src/middleware/verifyAdminAuth.ts
// Layer: middleware
// Purpose: Applies cross-cutting request rules like auth, validation, and errors.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import jwt from "jsonwebtoken";
import { pool } from "../db/index.js";
import { AppError } from "../utils/appError.js";
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
        const userResult = await pool.query(`
        SELECT id, is_admin, is_active
        FROM users
        WHERE id = $1
      `, [payload.userId]);
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
        req.user = {
            id: user.id,
            isAdmin: true,
        };
        next();
    }
    catch (error) {
        next(error);
    }
}


