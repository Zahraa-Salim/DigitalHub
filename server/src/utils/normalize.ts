// File: server/src/utils/normalize.ts
// Purpose: Provides shared helper logic for normalize.
// It supports other backend modules with reusable utility functions.


export function normalizeEmail(value?: string | null): string | null {
    if (!value) {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    return normalized.length ? normalized : null;
}
// Handles 'normalizePhone' workflow for this module.
export function normalizePhone(value?: string | null): string | null {
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

