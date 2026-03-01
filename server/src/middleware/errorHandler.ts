// File Summary: server/src/middleware/errorHandler.ts
// Layer: middleware
// Purpose: Applies cross-cutting request rules like auth, validation, and errors.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { ZodError } from "zod";
import { AppError } from "../utils/appError.js";
import { sendError } from "../utils/httpResponse.js";
export function notFound(_req, _res, next) {
    next(new AppError(404, "NOT_FOUND", "Route not found."));
}
function buildZodFieldErrors(error) {
    const fieldErrors = {};
    for (const issue of error.issues) {
        const field = issue.path.join(".") || "request";
        if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
        }
    }
    return { fieldErrors };
}
export function errorHandler(error, _req, res, _next) {
    if (error instanceof ZodError) {
        sendError(res, 400, "VALIDATION_ERROR", "Invalid request data", buildZodFieldErrors(error));
        return;
    }
    if (error instanceof AppError) {
        sendError(res, error.statusCode, error.code, error.message, error.details);
        return;
    }
  if (typeof error === "object" && error !== null && "code" in error) {
    const dbCode = String(error.code);
    if (dbCode === "23505") {
      sendError(res, 409, "VALIDATION_ERROR", "Duplicate value violates a unique constraint.");
      return;
        }
    if (dbCode === "23503") {
      sendError(res, 422, "VALIDATION_ERROR", "Related resource was not found.");
      return;
    }
    if (dbCode === "22P02") {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid value format.");
      return;
    }
    if (dbCode === "23514") {
      sendError(res, 400, "VALIDATION_ERROR", "Value violates a check constraint.");
      return;
    }
    if (dbCode === "08P01" || dbCode === "08006" || dbCode === "08001" || dbCode === "57P01") {
      sendError(res, 503, "DB_UNAVAILABLE", "Database connection is temporarily unavailable. Please try again.");
      return;
    }
  }
    // Log unexpected errors for easier operational debugging.
    console.error("Unhandled error:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Internal server error");
}


