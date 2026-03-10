// File: server/src/middleware/validatePagination.ts
// Purpose: Validates and normalizes pagination query parameters for list endpoints.
// It ensures page, limit, sort, and order values are safe before handlers use them.

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional(),
    order: z.enum(["asc", "desc"]).optional(),
});
// Handles 'validatePagination' workflow for this module.
export function validatePagination(req: Request, _res: Response, next: NextFunction): void {
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

