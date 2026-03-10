// File: server/src/schemas/notifications.schemas.ts
// Purpose: Defines the Zod schemas for notifications.
// It describes the request shapes and validation rules used before service logic runs.

// @ts-nocheck

import { z } from "zod";
export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();
export const emptyBodySchema = z.union([z.undefined(), z.object({}).strict()]);
export const clearReadOlderQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(3650),
}).strict();

