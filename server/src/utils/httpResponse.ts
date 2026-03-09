// File: server/src/utils/httpResponse.ts
// What this code does:
// 1) Provides reusable helper functions for backend modules.
// 2) Encapsulates common formatting, parsing, and safety checks.
// 3) Keeps route/controller code focused on workflow logic.
// 4) Avoids duplicating low-level utility code across files.
// @ts-nocheck
export function sendSuccess(res, data, message, statusCode = 200) {
    res.status(statusCode).json({
        success: true,
        data,
        ...(message ? { message } : {}),
    });
}
export function sendList(res, data, pagination, statusCode = 200) {
    res.status(statusCode).json({
        success: true,
        data,
        pagination,
    });
}
export function sendError(res, statusCode, code, message, details) {
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(details !== undefined ? { details } : {}),
        },
    });
}


