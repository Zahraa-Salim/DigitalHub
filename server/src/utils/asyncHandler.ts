// File Summary: server/src/utils/asyncHandler.ts
// Layer: utils
// Purpose: Provides shared utility helpers reused by multiple backend layers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
export function asyncHandler(handler) {
    return (req, res, next) => {
        handler(req, res, next).catch(next);
    };
}


