// File Summary: server/src/middleware/validatePagination.ts
// Layer: middleware
// Purpose: Applies cross-cutting request rules like auth, validation, and errors.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
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


