// File: server/src/middleware/validatePagination.ts
// What this code does:
// 1) Runs in the request pipeline before/after route handlers.
// 2) Enforces cross-cutting rules like auth, validation, and errors.
// 3) Normalizes request/response behavior for downstream code.
// 4) Removes duplicated policy logic from controllers.
// @ts-nocheck
import { z } from "zod";
const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional(),
    order: z.enum(["asc", "desc"]).optional(),
});
export function validatePagination(req, _res, next) {
    if (req.method !== "GET") {
        next();
        return;
    }
    try {
        paginationSchema.parse(req.query);
        next();
    }
    catch (error) {
        next(error);
    }
}


