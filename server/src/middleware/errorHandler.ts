// File: server/src/middleware/errorHandler.ts
// Purpose: Formats thrown errors into consistent API responses for Express routes.
// It normalizes known validation, auth, and application errors before sending JSON.

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/appError.js";
import { sendError } from "../utils/httpResponse.js";

// For unmatched routes, forward a standardized 404 error into the global handler.
export function notFound(_req: Request, _res: Response, next: NextFunction) {
    next(new AppError(404, "NOT_FOUND", "Route not found.", undefined));
}

// Converts Zod validation issues into a simple field-to-message map for API responses.
function buildZodFieldErrors(error: ZodError<unknown>) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
        const field = issue.path.map(String).join(".") || "request";
        if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
        }
    }
    return { fieldErrors };
}

// Central error middleware that normalizes known errors and sends consistent HTTP error payloads.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
    const rawCode = typeof error === "object" && error !== null && "code" in error
      ? String(error.code).toUpperCase()
      : "";
    const rawMessage = typeof error === "object" && error !== null && "message" in error
      ? String(error.message).toLowerCase()
      : "";

    if (error instanceof ZodError) {
        sendError(res, 400, "VALIDATION_ERROR", "Invalid request data", buildZodFieldErrors(error));
        return;
    }
    if (error instanceof AppError) {
        const appError = error as AppError & {
          statusCode: number;
          code: string;
          details?: unknown;
        };
        sendError(res, appError.statusCode, appError.code, appError.message, appError.details);
        return;
    }
  if (typeof error === "object" && error !== null && "code" in error) {
    const dbCode = String(error.code);
    if (dbCode === "23505") {
      sendError(res, 409, "VALIDATION_ERROR", "Duplicate value violates a unique constraint.", undefined);
      return;
        }
    if (dbCode === "23503") {
      sendError(res, 422, "VALIDATION_ERROR", "Related resource was not found.", undefined);
      return;
    }
    if (dbCode === "22P02") {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid value format.", undefined);
      return;
    }
    if (dbCode === "23514") {
      sendError(res, 400, "VALIDATION_ERROR", "Value violates a check constraint.", undefined);
      return;
    }
    if (dbCode === "08P01" || dbCode === "08006" || dbCode === "08001" || dbCode === "57P01") {
      sendError(res, 503, "DB_UNAVAILABLE", "Database connection is temporarily unavailable. Please try again.", undefined);
      return;
    }
  }

    if (
      rawCode === "ENOTFOUND" ||
      rawCode === "EAI_AGAIN" ||
      rawCode === "ETIMEDOUT" ||
      rawCode === "ECONNRESET" ||
      rawMessage.includes("connection timeout") ||
      rawMessage.includes("connection terminated unexpectedly") ||
      rawMessage.includes("getaddrinfo")
    ) {
      sendError(res, 503, "DB_UNAVAILABLE", "Database connection is temporarily unavailable. Please try again.", undefined);
      return;
    }

    // Log unexpected errors for easier operational debugging.
    console.error("Unhandled error:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Internal server error", undefined);
}

