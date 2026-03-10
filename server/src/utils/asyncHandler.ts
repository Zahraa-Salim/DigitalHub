// File: server/src/utils/asyncHandler.ts
// Purpose: Provides shared helper logic for async handler.
// It supports other backend modules with reusable utility functions.

import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncExpressHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(handler: AsyncExpressHandler): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        handler(req, res, next).catch(next);
    };
}

