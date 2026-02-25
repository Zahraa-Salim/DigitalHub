// File Summary: server/src/schemas/forms.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";

export const idParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

const formFieldTypeSchema = z.enum(["text", "textarea", "email", "phone", "select", "checkbox", "date", "file"]);

export const formFieldSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    label: z.string().trim().min(1),
    type: formFieldTypeSchema,
    required: z.boolean().optional(),
    options: z.unknown().optional(),
    placeholder: z.string().trim().nullable().optional(),
    min_length: z.number().int().min(0).nullable().optional(),
    max_length: z.number().int().min(0).nullable().optional(),
    sort_order: z.number().int().min(0).optional(),
    is_enabled: z.boolean().optional(),
  })
  .strict();

export const formPayloadSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    is_active: z.boolean().optional(),
    fields: z.array(formFieldSchema).min(1),
  })
  .strict();

export const cohortFormPayloadSchema = z
  .object({
    mode: z.enum(["general", "custom"]),
    form: formPayloadSchema.partial({ fields: true }).optional(),
  })
  .strict();
