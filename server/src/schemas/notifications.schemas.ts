// File Summary: server/src/schemas/notifications.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();
export const emptyBodySchema = z.union([z.undefined(), z.object({}).strict()]);


