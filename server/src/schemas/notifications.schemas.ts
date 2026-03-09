// File: server/src/schemas/notifications.schemas.ts
// What this code does:
// 1) Implements module-specific behavior for this code unit.
// 2) Coordinates inputs, internal processing, and outputs.
// 3) Uses shared utilities to keep logic consistent and reusable.
// 4) Exports functions/components used by other project modules.
// @ts-nocheck
import { z } from "zod";
export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();
export const emptyBodySchema = z.union([z.undefined(), z.object({}).strict()]);
export const clearReadOlderQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(3650),
}).strict();


