// File Summary: server/src/middleware/validateRequest.ts
// Layer: middleware
// Purpose: Applies cross-cutting request rules like auth, validation, and errors.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
export function validateRequest(schemas) {
    return (req, _res, next) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }
            if (schemas.query) {
                const parsedQuery = schemas.query.parse(req.query);
                // Express 5 exposes req.query as a getter-only property.
                // Mutate the existing object instead of reassigning the property.
                if (req.query && typeof req.query === "object") {
                    for (const key of Object.keys(req.query)) {
                        delete req.query[key];
                    }
                    Object.assign(req.query, parsedQuery);
                }
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}


