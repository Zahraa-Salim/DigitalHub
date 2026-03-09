// File: server/src/utils/asyncHandler.ts
// What this code does:
// 1) Provides reusable helper functions for backend modules.
// 2) Encapsulates common formatting, parsing, and safety checks.
// 3) Keeps route/controller code focused on workflow logic.
// 4) Avoids duplicating low-level utility code across files.
// @ts-nocheck
export function asyncHandler(handler) {
    return (req, res, next) => {
        handler(req, res, next).catch(next);
    };
}


