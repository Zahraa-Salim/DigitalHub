// File: server/src/utils/pagination.ts
// Purpose: Provides shared helper logic for pagination.
// It supports other backend modules with reusable utility functions.


import { z } from "zod";
import { AppError } from "./appError.js";

type ParsedListQuery = {
    page: number;
    limit: number;
    offset: number;
    sortBy: string;
    order: "asc" | "desc";
    search?: string;
    status?: string;
    isPublic?: boolean;
    featured?: boolean;
    activeOnly?: boolean;
    cohortId?: number;
};

type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

const baseListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10),
    sortBy: z.string().trim().min(1).optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    search: z.string().trim().min(1).optional(),
    status: z.string().trim().min(1).optional(),
    is_public: z.union([z.boolean(), z.string()]).optional(),
    featured: z.union([z.boolean(), z.string()]).optional(),
    active_only: z.union([z.boolean(), z.string()]).optional(),
    cohort_id: z.union([z.number(), z.string()]).optional(),
});
// Handles 'parseBooleanValue' workflow for this module.
function parseBooleanValue(input: unknown, fieldName: string): boolean | undefined {
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
// Handles 'parseOptionalInteger' workflow for this module.
function parseOptionalInteger(input: unknown, fieldName: string): number | undefined {
    if (input === undefined) {
        return undefined;
    }
    const parsed = Number(input);
    if (!Number.isInteger(parsed)) {
        throw new AppError(400, "VALIDATION_ERROR", `Query param '${fieldName}' must be an integer.`);
    }
    return parsed;
}
// Handles 'parseListQuery' workflow for this module.
export function parseListQuery(
    query: unknown,
    allowedSortColumns: readonly string[],
    defaultSortColumn: string,
): ParsedListQuery {
    const parsed = baseListQuerySchema.parse(query);
    const normalizedLimit = Math.min(parsed.limit, 100);
    if (!allowedSortColumns.includes(defaultSortColumn)) {
        throw new AppError(500, "INTERNAL_ERROR", "Invalid list configuration for default sort column.");
    }
    if (parsed.sortBy && !allowedSortColumns.includes(parsed.sortBy)) {
        throw new AppError(400, "VALIDATION_ERROR", `Unsupported sortBy value '${parsed.sortBy}'. Allowed: ${allowedSortColumns.join(", ")}`);
    }
    return {
        page: parsed.page,
        limit: normalizedLimit,
        offset: (parsed.page - 1) * normalizedLimit,
        sortBy: parsed.sortBy ?? defaultSortColumn,
        order: parsed.order,
        search: parsed.search,
        status: parsed.status,
        isPublic: parseBooleanValue(parsed.is_public, "is_public"),
        featured: parseBooleanValue(parsed.featured, "featured"),
        activeOnly: parseBooleanValue(parsed.active_only, "active_only"),
        cohortId: parseOptionalInteger(parsed.cohort_id, "cohort_id"),
    };
}
// Handles 'parseQueryBoolean' workflow for this module.
export function parseQueryBoolean(input: unknown, fieldName: string): boolean | undefined {
    return parseBooleanValue(input, fieldName);
}
// Handles 'buildPagination' workflow for this module.
export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
    return {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
}

