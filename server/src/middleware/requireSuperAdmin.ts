// File: server/src/middleware/requireSuperAdmin.ts
// What this code does:
// 1) Runs in the request pipeline before/after route handlers.
// 2) Enforces cross-cutting rules like auth, validation, and errors.
// 3) Normalizes request/response behavior for downstream code.
// 4) Removes duplicated policy logic from controllers.
// @ts-nocheck
import { AppError } from "../utils/appError.js";
export function requireSuperAdmin(req, _res, next) {
    if (!req.user || req.user.role !== "super_admin") {
        throw new AppError(403, "FORBIDDEN", "Only super admin can access this route.");
    }
    next();
}
