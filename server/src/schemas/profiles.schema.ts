// File Summary: server/src/schemas/profiles.schema.ts
// Layer: schemas
// Purpose: Defines Zod schemas for student profile API request validation.
// Notes: Validates fetch, update, and public profile endpoints.
// @ts-nocheck
import { z } from "zod";

const urlSchema = z.union([z.literal(""), z.string().trim().url()]);

// Params: GET /profiles/students/:userId
export const studentUserIdParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
}).strict();

// Params: GET /public/students/:publicSlug
export const publicSlugParamsSchema = z.object({
  public_slug: z.string().trim().min(1).max(100),
}).strict();

// Body: PATCH /profiles/students/:userId
export const updateStudentProfileBodySchema = z.object({
  full_name: z.union([z.literal(""), z.string().trim().min(1).max(120)]).optional(),
  avatar_url: urlSchema.optional(),
  bio: z.union([z.literal(""), z.string().trim().max(2000)]).optional(),
  linkedin_url: urlSchema.optional(),
  github_url: urlSchema.optional(),
  portfolio_url: urlSchema.optional(),
  is_public: z.boolean().optional(),
  featured: z.boolean().optional(),
  featured_rank: z.union([z.literal(null), z.number().int().positive()]).optional(),
  public_slug: z.union([z.literal(""), z.string().trim().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only").min(3).max(50)]).optional(),
  is_graduated: z.boolean().optional(),
  is_working: z.boolean().optional(),
  open_to_work: z.boolean().optional(),
  company_work_for: z.union([z.literal(""), z.string().trim().max(120)]).optional(),
})
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

// Response types
export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileBodySchema>;
