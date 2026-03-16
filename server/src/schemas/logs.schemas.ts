// File: server/src/schemas/logs.schemas.ts
// Purpose: Defines the Zod schemas for logs.
// It describes the request shapes and validation rules used before service logic runs.

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

