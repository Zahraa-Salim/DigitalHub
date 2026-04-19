// File: server/src/middleware/validateRequest.ts
// Purpose: Builds middleware that validates request body, params, and query values against schemas.
// It parses incoming values before controllers run and writes the validated shapes back onto req.

// For Express 5 query objects, it mutates req.query in place instead of reassigning it.

import type { NextFunction, Request, Response } from "express";
import type { ZodIssue, ZodTypeAny } from "zod";
import { AppError } from "../utils/appError.js";

type ValidationSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

function buildFieldErrors(issues: ZodIssue[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path.map(String).join(".") || "request";
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return { fieldErrors };
}

export function validateRequest(schemas: ValidationSchemas) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            if (schemas.body) {
                const result = schemas.body.safeParse(req.body);
                if (!result.success) {
                  throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", buildFieldErrors(result.error.issues));
                }
                req.body = result.data;
            }
            if (schemas.params) {
                const result = schemas.params.safeParse(req.params);
                if (!result.success) {
                  throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", buildFieldErrors(result.error.issues));
                }
                req.params = result.data as Request["params"];
            }
            if (schemas.query) {
                const result = schemas.query.safeParse(req.query);
                if (!result.success) {
                  throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", buildFieldErrors(result.error.issues));
                }
                const parsedQuery = result.data as Record<string, unknown>;
                // Express 5 exposes req.query as a getter-only property.
                // Mutate the existing object instead of reassigning the property.
                if (req.query && typeof req.query === "object") {
                    const queryObject = req.query as Record<string, unknown>;
                    for (const key of Object.keys(queryObject)) {
                        delete queryObject[key];
                    }
                    Object.assign(queryObject, parsedQuery);
                }
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}

