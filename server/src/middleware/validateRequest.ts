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
                req.query = schemas.query.parse(req.query);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}


