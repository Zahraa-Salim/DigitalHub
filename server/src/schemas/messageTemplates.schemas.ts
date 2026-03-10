// File: server/src/schemas/messageTemplates.schemas.ts
// Purpose: Defines the Zod schemas for message templates.
// It describes the request shapes and validation rules used before service logic runs.

// @ts-nocheck

import { z } from "zod";

export const messageTemplatesListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional(),
    sortBy: z.enum(["sort_order", "key", "label", "created_at", "updated_at"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    include_inactive: z.coerce.boolean().optional().default(false),
  })
  .strict();

export const messageTemplateKeyParamsSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9_]+$/, "Template key must use lowercase letters, numbers, and underscores."),
  })
  .strict();

export const messageTemplatePatchSchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    channel: z.enum(["email", "sms", "all"]).optional(),
    subject: z.string().trim().max(200).nullable().optional(),
    body: z.string().trim().min(1).max(10000).optional(),
    is_active: z.boolean().optional(),
    sort_order: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const messageTemplateCreateSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9_]+$/, "Template key must use lowercase letters, numbers, and underscores.")
      .optional(),
    label: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullable().optional(),
    channel: z.enum(["email", "sms", "all"]).default("all").optional(),
    subject: z.string().trim().max(200).nullable().optional(),
    body: z.string().trim().min(1).max(10000),
    is_active: z.boolean().default(true).optional(),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0).optional(),
  })
  .strict();

