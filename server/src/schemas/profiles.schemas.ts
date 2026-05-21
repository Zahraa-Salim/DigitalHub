// File: server/src/schemas/profiles.schemas.ts
// Purpose: Defines the Zod schemas for profiles.
// It describes the request shapes and validation rules used before service logic runs.

import { z } from "zod";

const urlOrUploadPath = z.string().trim().refine(
  (value) => !value || value.startsWith("/uploads/") || /^https?:\/\/./.test(value),
  { message: "Must be a valid URL or upload path" }
);
export const userIdParamsSchema = z.object({
    userId: z.coerce.number().int().positive(),
}).strict();
export const visibilitySchema = z.object({
    is_public: z.boolean(),
}).strict();

export const emptyProfileBodySchema = z.object({}).strict();

export const instructorAvatarUploadSchema = z
    .object({
    filename: z.string().trim().min(1).max(120).optional(),
    mime_type: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
    data_base64: z.string().trim().min(1),
})
    .strict();

export const instructorCreateSchema = z
    .object({
    email: z.union([z.literal(""), z.string().trim().email()]).optional(),
    phone: z.union([z.literal(""), z.string().trim().min(4)]).optional(),
    full_name: z.string().trim().min(1),
    avatar_url: z.union([z.literal(""), urlOrUploadPath]).nullable().optional(),
    bio: z.string().trim().nullable().optional(),
    expertise: z.string().trim().nullable().optional(),
    skills: z.string().trim().nullable().optional(),
    linkedin_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    github_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    portfolio_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    is_public: z.boolean().optional(),
})
    .strict()
    .refine((payload) => Boolean((payload.email || "").trim()) || Boolean((payload.phone || "").trim()), {
    message: "Email or phone is required.",
});
export const studentPatchSchema = z
    .object({
    full_name: z.union([z.literal(""), z.string().trim().min(1)]).optional(),
    avatar_url: z.union([z.literal(""), urlOrUploadPath]).nullable().optional(),
    bio: z.string().trim().nullable().optional(),
    linkedin_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    github_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    portfolio_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    featured: z.boolean().optional(),
    featured_rank: z.number().int().nullable().optional(),
    public_slug: z.union([z.literal(""), z.string().trim().min(1)]).nullable().optional(),
    is_graduated: z.boolean().optional(),
    is_working: z.boolean().optional(),
    open_to_work: z.boolean().optional(),
    company_work_for: z.string().trim().nullable().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });
export const instructorPatchSchema = z
    .object({
    full_name: z.union([z.literal(""), z.string().trim().min(1)]).optional(),
    email: z.union([z.literal(""), z.string().trim().email()]).optional(),
    phone: z.union([z.literal(""), z.string().trim().min(4)]).optional(),
    avatar_url: z.union([z.literal(""), urlOrUploadPath]).nullable().optional(),
    bio: z.string().trim().nullable().optional(),
    expertise: z.string().trim().nullable().optional(),
    skills: z.string().trim().nullable().optional(),
    linkedin_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    github_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    portfolio_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    is_public: z.boolean().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });
export const managerPatchSchema = z
    .object({
    full_name: z.union([z.literal(""), z.string().trim().min(1)]).optional(),
    email: z.union([z.literal(""), z.string().trim().email()]).optional(),
    phone: z.union([z.literal(""), z.string().trim().min(4)]).optional(),
    avatar_url: z.union([z.literal(""), urlOrUploadPath]).nullable().optional(),
    bio: z.string().trim().nullable().optional(),
    job_title: z.string().trim().nullable().optional(),
    skills: z.string().trim().nullable().optional(),
    admin_role: z.enum(["admin", "super_admin"]).optional(),
    linkedin_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    github_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    portfolio_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    sort_order: z.number().int().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });

// ===================================
// STUDENT PROFILE DEDICATED SCHEMAS
// ===================================

export const studentUserIdParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
}).strict();

export const publicSlugParamsSchema = z.object({
  public_slug: z.string().trim().min(1).max(100),
}).strict();

export const updateStudentProfileBodySchema = z.object({
  full_name: z.union([z.literal(""), z.string().trim().min(1).max(120)]).optional(),
  email: z.union([z.literal(""), z.string().trim().email()]).optional(),
  phone: z.union([z.literal(""), z.string().trim().min(4)]).optional(),
  avatar_url: z.union([z.literal(""), urlOrUploadPath]).nullable().optional(),
  bio: z.union([z.literal(""), z.string().trim().max(2000)]).nullable().optional(),
  linkedin_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
  github_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
  portfolio_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
  is_public: z.boolean().optional(),
  featured: z.boolean().optional(),
  featured_rank: z.union([z.literal(null), z.number().int().positive()]).nullable().optional(),
  public_slug: z.union([z.literal(""), z.string().trim().regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only").min(3).max(50)]).nullable().optional(),
  is_graduated: z.boolean().optional(),
  is_working: z.boolean().optional(),
  open_to_work: z.boolean().optional(),
  company_work_for: z.union([z.literal(""), z.string().trim().max(120)]).nullable().optional(),
  cv_url: z.union([z.literal(""), urlOrUploadPath]).nullable().optional(),
  add_cohort_ids: z.array(z.number().int().positive()).optional(),
  remove_cohort_ids: z.array(z.number().int().positive()).optional(),
})
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
  });

export const studentStatusPatchSchema = z.object({
  status: z.enum(["active", "dropout"]),
  reason: z.string().trim().max(2000).optional(),
})
  .strict()
  .refine((payload) => payload.status !== "dropout" || Boolean(String(payload.reason || "").trim()), {
    message: "Dropout reason is required.",
    path: ["reason"],
  });

export const studentAvatarUploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(120).optional(),
    mime_type: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
    data_base64: z.string().trim().min(1),
  })
  .strict();

export const studentCvUploadSchema = z.object({
  filename: z.string().min(1),
  mime_type: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ]),
  data_base64: z.string().min(1),
});

export const managerAvatarUploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(120).optional(),
    mime_type: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
    data_base64: z.string().trim().min(1),
  })
  .strict();

export const studentCreateSchema = z
  .object({
    email: z.union([z.literal(""), z.string().trim().email()]).optional(),
    phone: z.union([z.literal(""), z.string().trim().min(4)]).optional(),
    full_name: z.string().trim().min(1),
    cohort_id: z.number().int().positive(),
    avatar_url: z.union([z.literal(""), urlOrUploadPath]).nullable().optional(),
    bio: z.string().trim().nullable().optional(),
    linkedin_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    github_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    portfolio_url: z.union([z.literal(""), z.string().trim().url()]).nullable().optional(),
    is_public: z.boolean().optional(),
    is_graduated: z.boolean().optional(),
    is_working: z.boolean().optional(),
    open_to_work: z.boolean().optional(),
    company_work_for: z.string().trim().nullable().optional(),
    cv_url: z.union([z.literal(""), urlOrUploadPath]).nullable().optional(),
  })
  .strict()
  .refine(
    (payload) => Boolean((payload.email || "").trim()) || Boolean((payload.phone || "").trim()),
    { message: "Email or phone is required." },
  );

