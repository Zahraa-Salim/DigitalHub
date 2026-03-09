// File: server/src/utils/normalize.ts
// What this code does:
// 1) Provides reusable helper functions for backend modules.
// 2) Encapsulates common formatting, parsing, and safety checks.
// 3) Keeps route/controller code focused on workflow logic.
// 4) Avoids duplicating low-level utility code across files.
// @ts-nocheck
export function normalizeEmail(value) {
    if (!value) {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    return normalized.length ? normalized : null;
}
export function normalizePhone(value) {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed.length) {
        return null;
    }
    const normalized = trimmed.replace(/[\s\-()]/g, "");
    if (!/^\+?\d+$/.test(normalized)) {
        return null;
    }
    return normalized;
}


