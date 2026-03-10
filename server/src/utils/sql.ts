// File: server/src/utils/sql.ts
// Purpose: Provides shared helper logic for SQL.
// It supports other backend modules with reusable utility functions.


import { AppError } from "./appError.js";
// Handles 'buildUpdateQuery' workflow for this module.
export function buildUpdateQuery(
    payload: Record<string, unknown>,
    allowedColumns: readonly string[],
    startIndex = 1,
): { setClause: string; values: unknown[] } {
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
// Handles 'buildSearchClause' workflow for this module.
export function buildSearchClause(columns: readonly string[], paramIndex: number): string {
    const predicates = columns.map((column) => `${column} ILIKE $${paramIndex}`);
    return `(${predicates.join(" OR ")})`;
}

