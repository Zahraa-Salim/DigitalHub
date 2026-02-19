// File Summary: server/src/utils/pagination.ts
// Layer: utils
// Purpose: Provides shared utility helpers reused by multiple backend layers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
import { AppError } from "./appError.js";
const baseListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.string().trim().min(1).optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    search: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional(),
    is_public: z.union([z.boolean(), z.string()]).optional(),
    featured: z.union([z.boolean(), z.string()]).optional(),
    cohort_id: z.union([z.number(), z.string()]).optional(),
});
function parseBooleanValue(input, fieldName) {
    if (input === undefined) {
        return undefined;
    }
    if (typeof input === "boolean") {
        return input;
    }
    if (typeof input === "string") {
        const normalized = input.trim().toLowerCase();
        if (["true", "1", "yes"].includes(normalized)) {
            return true;
        }
        if (["false", "0", "no"].includes(normalized)) {
            return false;
        }
    }
    throw new AppError(400, "VALIDATION_ERROR", `Query param '${fieldName}' must be a boolean.`);
}
function parseOptionalInteger(input, fieldName) {
    if (input === undefined) {
        return undefined;
    }
    const parsed = Number(input);
    if (!Number.isInteger(parsed)) {
        throw new AppError(400, "VALIDATION_ERROR", `Query param '${fieldName}' must be an integer.`);
    }
    return parsed;
}
export function parseListQuery(query, allowedSortColumns, defaultSortColumn) {
    const parsed = baseListQuerySchema.parse(query);
    if (!allowedSortColumns.includes(defaultSortColumn)) {
        throw new AppError(500, "INTERNAL_ERROR", "Invalid list configuration for default sort column.");
    }
    if (parsed.sortBy && !allowedSortColumns.includes(parsed.sortBy)) {
        throw new AppError(400, "VALIDATION_ERROR", `Unsupported sortBy value '${parsed.sortBy}'. Allowed: ${allowedSortColumns.join(", ")}`);
    }
    return {
        page: parsed.page,
        limit: parsed.limit,
        offset: (parsed.page - 1) * parsed.limit,
        sortBy: parsed.sortBy ?? defaultSortColumn,
        order: parsed.order,
        search: parsed.search,
        status: parsed.status,
        isPublic: parseBooleanValue(parsed.is_public, "is_public"),
        featured: parseBooleanValue(parsed.featured, "featured"),
        cohortId: parseOptionalInteger(parsed.cohort_id, "cohort_id"),
    };
}
export function parseQueryBoolean(input, fieldName) {
    return parseBooleanValue(input, fieldName);
}
export function buildPagination(page, limit, total) {
    return {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
}


