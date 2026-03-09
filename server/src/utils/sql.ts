// File: server/src/utils/sql.ts
// What this code does:
// 1) Provides reusable helper functions for backend modules.
// 2) Encapsulates common formatting, parsing, and safety checks.
// 3) Keeps route/controller code focused on workflow logic.
// 4) Avoids duplicating low-level utility code across files.
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


