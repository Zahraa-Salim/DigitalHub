// File Summary: server/src/schemas/auth.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
const avatarDataUrlPattern = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const avatarUrlSchema = z.union([
    z.literal(""),
    z.string().trim().regex(avatarDataUrlPattern, "Invalid avatar image data URL"),
    z.string().trim().url()
]);
export const loginBodySchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
}).strict();
export const adminUserIdParamsSchema = z.object({
    userId: z.coerce.number().int().positive(),
}).strict();
export const updateMeBodySchema = z.object({
    full_name: z.union([z.literal(""), z.string().trim().min(1).max(120)]).optional(),
    phone: z.union([z.literal(""), z.string().trim().min(3)]).optional(),
    bio: z.union([z.literal(""), z.string().trim().max(2000)]).optional(),
    job_title: z.union([z.literal(""), z.string().trim().max(120)]).optional(),
    avatar_url: avatarUrlSchema.optional(),
    linkedin_url: z.union([z.literal(""), z.string().trim().url()]).optional(),
    github_url: z.union([z.literal(""), z.string().trim().url()]).optional(),
    portfolio_url: z.union([z.literal(""), z.string().trim().url()]).optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
});
export const superAdminUpdateAdminBodySchema = z.object({
    full_name: z.union([z.literal(""), z.string().trim().min(1).max(120)]).optional(),
    email: z.union([z.literal(""), z.string().trim().email()]).optional(),
    phone: z.union([z.literal(""), z.string().trim().min(3)]).optional(),
    bio: z.union([z.literal(""), z.string().trim().max(2000)]).optional(),
    job_title: z.union([z.literal(""), z.string().trim().max(120)]).optional(),
    avatar_url: avatarUrlSchema.optional(),
    linkedin_url: z.union([z.literal(""), z.string().trim().url()]).optional(),
    github_url: z.union([z.literal(""), z.string().trim().url()]).optional(),
    portfolio_url: z.union([z.literal(""), z.string().trim().url()]).optional(),
    admin_role: z.enum(["admin", "super_admin"]).optional(),
    is_active: z.boolean().optional(),
    is_public: z.boolean().optional(),
    sort_order: z.number().int().optional(),
    new_password: z.string().min(8).optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
});
export const createAdminBodySchema = z.object({
    full_name: z.string().trim().min(1).max(120),
    email: z.union([z.literal(""), z.string().trim().email()]).optional(),
    phone: z.string().trim().min(3).optional(),
    password: z.string().min(8),
    admin_role: z.enum(["admin", "super_admin"]).default("admin"),
    is_active: z.boolean().optional(),
    avatar_url: avatarUrlSchema.optional(),
    bio: z.union([z.literal(""), z.string().trim().max(2000)]).optional(),
    job_title: z.union([z.literal(""), z.string().trim().max(120)]).optional(),
    linkedin_url: z.union([z.literal(""), z.string().trim().url()]).optional(),
    github_url: z.union([z.literal(""), z.string().trim().url()]).optional(),
    portfolio_url: z.union([z.literal(""), z.string().trim().url()]).optional(),
})
    .strict()
    .refine((payload) => Boolean(payload.email || payload.phone), {
    message: "At least one of email or phone is required.",
});
export const uploadAvatarBodySchema = z.object({
    filename: z.string().trim().min(1).max(255),
    mime_type: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
    data_base64: z.string().trim().min(1),
}).strict();


