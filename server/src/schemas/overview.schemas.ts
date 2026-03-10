// File: server/src/schemas/overview.schemas.ts
// Purpose: Defines the Zod schemas for overview.
// It describes the request shapes and validation rules used before service logic runs.

// @ts-nocheck

import { z } from "zod";

export const overviewRetryFailedMessagesBodySchema = z
  .object({
    channel: z.enum(["email", "whatsapp", "all"]),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export const overviewMessageIdParamsSchema = z
  .object({
    messageId: z.coerce.number().int().min(1),
  })
  .strict();

export const overviewMessagesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["draft", "sent", "failed"]).default("sent"),
    channel: z.enum(["all", "email", "whatsapp"]).default("all"),
    search: z.string().trim().max(200).optional(),
  })
  .strict();

