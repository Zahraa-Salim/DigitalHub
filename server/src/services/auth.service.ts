// File Summary: server/src/services/auth.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { findActiveAdminByEmail, updateLastLogin } from "../repositories/auth.repo.js";
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


