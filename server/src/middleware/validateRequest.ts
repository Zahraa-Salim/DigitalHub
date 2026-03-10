// File: server/src/middleware/validateRequest.ts
// Purpose: Builds middleware that validates request body, params, and query values against schemas.
// It parses incoming values before controllers run and writes the validated shapes back onto req.

// For Express 5 query objects, it mutates req.query in place instead of reassigning it.

import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type ValidationSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

export function validateRequest(schemas: ValidationSchemas) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.params) {
                req.params = schemas.params.parse(req.params) as Request["params"];
            }
            if (schemas.query) {
                const parsedQuery = schemas.query.parse(req.query) as Record<string, unknown>;
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

