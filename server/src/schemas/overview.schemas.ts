// File: server/src/schemas/overview.schemas.ts
// What this code does:
// 1) Implements module-specific behavior for this code unit.
// 2) Coordinates inputs, internal processing, and outputs.
// 3) Uses shared utilities to keep logic consistent and reusable.
// 4) Exports functions/components used by other project modules.
// @ts-nocheck
import { z } from "zod";

export const overviewRetryFailedMessagesBodySchema = z
  .object({
    channel: z.enum(["email", "whatsapp"]),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export const overviewMessagesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["sent", "failed"]).default("sent"),
    channel: z.enum(["all", "email", "whatsapp"]).default("all"),
    search: z.string().trim().max(200).optional(),
  })
  .strict();
