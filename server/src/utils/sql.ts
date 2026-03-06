// File Summary: server/src/utils/sql.ts
// Layer: utils
// Purpose: Provides shared utility helpers reused by multiple backend layers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { AppError } from "./appError.js";
export function buildUpdateQuery(payload, allowedColumns, startIndex = 1) {
    const entries = Object.entries(payload).filter(([key, value]) => allowedColumns.includes(key) && value !== undefined);
    if (entries.length === 0) {
        throw new AppError(400, "VALIDATION_ERROR", "No valid fields provided for update.");
    }
    const values = entries.map((entry) => entry[1]);
    const setClause = entries
        .map((entry, index) => `${entry[0]} = $${startIndex + index}`)
        .join(", ");
    return { setClause, values };
}
export function buildSearchClause(columns, paramIndex) {
    const predicates = columns.map((column) => `${column} ILIKE $${paramIndex}`);
    return `(${predicates.join(" OR ")})`;
}


