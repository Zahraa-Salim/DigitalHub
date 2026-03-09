// File: server/src/schemas/logs.schemas.ts
// What this code does:
// 1) Implements module-specific behavior for this code unit.
// 2) Coordinates inputs, internal processing, and outputs.
// 3) Uses shared utilities to keep logic consistent and reusable.
// 4) Exports functions/components used by other project modules.
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


