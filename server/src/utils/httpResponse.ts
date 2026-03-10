// File: server/src/utils/httpResponse.ts
// Purpose: Provides shared helper logic for http response.
// It supports other backend modules with reusable utility functions.

import type { Response } from "express";

type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): void {
    res.status(statusCode).json({
        success: true,
        data,
        ...(message ? { message } : {}),
    });
}
// Handles 'sendList' workflow for this module.
export function sendList<T>(res: Response, data: T, pagination: PaginationMeta, statusCode = 200): void {
    res.status(statusCode).json({
        success: true,
        data,
        pagination,
    });
}
// Handles 'sendError' workflow for this module.
export function sendError(
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
): void {
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(details !== undefined ? { details } : {}),
        },
    });
}

