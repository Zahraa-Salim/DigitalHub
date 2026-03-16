// File: server/src/schemas/admins.schemas.ts
// Purpose: Defines the Zod schemas for admins.
// It describes the request shapes and validation rules used before service logic runs.

import { z } from "zod";

export const adminUserIdParamsSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
  })
  .strict();

export const adminCreateSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(8),
    full_name: z.string().trim().min(1).optional(),
    job_title: z.string().trim().max(120).optional(),
    avatar_url: z.string().trim().url().optional(),
    is_public: z.boolean().optional(),
    sort_order: z.number().int().optional(),
    admin_role: z.enum(["admin", "super_admin"]).optional(),
  })
  .strict();

export const adminPatchSchema = z
  .object({
    admin_role: z.enum(["admin", "super_admin"]).optional(),
    is_active: z.boolean().optional(),
    full_name: z.string().trim().min(1).optional(),
    job_title: z.string().trim().max(120).nullable().optional(),
    avatar_url: z.string().trim().url().nullable().optional(),
    is_public: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

export const emptyBodySchema = z.object({}).strict();

