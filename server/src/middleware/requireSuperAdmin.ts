// File Summary: server/src/middleware/requireSuperAdmin.ts
// Layer: middleware
// Purpose: Enforces super-admin-only access for protected management routes.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { AppError } from "../utils/appError.js";
export function requireSuperAdmin(req, _res, next) {
    if (!req.user || req.user.role !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "Only super admin can access this route.");
    }
    next();
}
