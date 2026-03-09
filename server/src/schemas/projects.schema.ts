// File: server/src/schemas/projects.schema.ts
// What this code does:
// 1) Implements module-specific behavior for this code unit.
// 2) Coordinates inputs, internal processing, and outputs.
// 3) Uses shared utilities to keep logic consistent and reusable.
// 4) Exports functions/components used by other project modules.
// @ts-nocheck
import { z } from "zod";

const nullableUrlSchema = z.string().trim().url().nullable();
const nullablePositiveIntSchema = z.union([z.coerce.number().int().positive(), z.null()]);

export const projectIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const publicSlugParamsSchema = z.object({
  public_slug: z.string().trim().min(1),
}).strict();

export const projectCreateSchema = z.object({
  student_user_id: z.coerce.number().int().positive(),
  cohort_id: nullablePositiveIntSchema.optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  image_url: nullableUrlSchema.optional(),
  github_url: nullableUrlSchema.optional(),
  live_url: nullableUrlSchema.optional(),
  is_public: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
}).strict();

export const projectPatchSchema = z
  .object({
    student_user_id: z.coerce.number().int().positive().optional(),
    cohort_id: nullablePositiveIntSchema.optional(),
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    image_url: nullableUrlSchema.optional(),
    github_url: nullableUrlSchema.optional(),
    live_url: nullableUrlSchema.optional(),
    is_public: z.boolean().optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });
