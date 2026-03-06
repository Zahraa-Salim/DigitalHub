// File Summary: server/src/utils/normalize.ts
// Layer: utils
// Purpose: Provides shared utility helpers reused by multiple backend layers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
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


