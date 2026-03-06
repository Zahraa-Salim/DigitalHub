// File Summary: server/src/schemas/logs.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const logsFiltersSchema = z
    .object({
    actor_user_id: z.coerce.number().int().positive().optional(),
    action: z.string().trim().min(1).optional(),
    entity_type: z.string().trim().min(1).optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
})
    .strict()
    .partial();


