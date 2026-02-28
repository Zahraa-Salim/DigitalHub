// File Summary: server/src/schemas/overview.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";

export const overviewRetryFailedMessagesBodySchema = z
  .object({
    channel: z.enum(["email", "whatsapp"]),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

