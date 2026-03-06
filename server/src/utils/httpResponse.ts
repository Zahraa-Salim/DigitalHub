// File Summary: server/src/utils/httpResponse.ts
// Layer: utils
// Purpose: Provides shared utility helpers reused by multiple backend layers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
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


