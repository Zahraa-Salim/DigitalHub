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

export const formFieldIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const formsListQuerySchema = z
  .object({
    scope: z.enum(["general", "cohort", "all"]).optional(),
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

export const formFieldCreateSchema = z
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

export const formFieldUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    label: z.string().trim().min(1).optional(),
    type: formFieldTypeSchema.optional(),
    required: z.boolean().optional(),
    options: z.unknown().optional(),
    placeholder: z.string().trim().nullable().optional(),
    min_length: z.number().int().min(0).nullable().optional(),
    max_length: z.number().int().min(0).nullable().optional(),
    sort_order: z.number().int().min(0).optional(),
    is_enabled: z.boolean().optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

export const formPayloadSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    is_active: z.boolean().optional(),
    fields: z.array(formFieldSchema).min(1),
  })
  .strict();

export const formCreateSchema = z
  .object({
    key: z.string().trim().min(1),
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    is_active: z.boolean().optional(),
    fields: z.array(formFieldSchema).optional(),
  })
  .strict();

export const formPatchPayloadSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    is_active: z.boolean().optional(),
    fields: z.array(formFieldSchema).min(1).optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

export const cohortFormPayloadSchema = z
  .object({
    mode: z.enum(["general", "custom"]),
    form: formPayloadSchema.partial({ fields: true }).optional(),
  })
  .strict();

export const cohortFormAssignBodySchema = z
  .object({
    mode: z.enum(["general", "custom"]),
  })
  .strict();

export const formFieldsPatchSchema = z
  .object({
    form_id: z.number().int().positive(),
    fields: z.array(formFieldSchema).min(1),
  })
  .strict();

export const programApplicationFormPatchSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

export const programApplicationFormFieldsPatchSchema = z
  .object({
    fields: z.array(formFieldSchema).min(1),
  })
  .strict();

export const formFieldsReorderSchema = z
  .object({
    orderedFieldIds: z.array(z.number().int().positive()).min(1),
  })
  .strict();
