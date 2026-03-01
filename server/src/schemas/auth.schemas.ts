// File Summary: server/src/schemas/auth.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const loginBodySchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
}).strict();
export const adminUserIdParamsSchema = z.object({
    userId: z.coerce.number().int().positive(),
}).strict();
export const updateMeBodySchema = z.object({
    full_name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(3).or(z.literal("")).optional(),
    is_public: z.boolean().optional(),
    bio: z.string().trim().max(2000).optional(),
    job_title: z.string().trim().max(120).optional(),
    avatar_url: z.string().trim().url().or(z.literal("")).optional(),
    linkedin_url: z.string().trim().url().or(z.literal("")).optional(),
    github_url: z.string().trim().url().or(z.literal("")).optional(),
    portfolio_url: z.string().trim().url().or(z.literal("")).optional(),
    current_password: z.string().min(1).optional(),
    new_password: z.string().min(8).optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required.",
})
    .refine((payload) => {
    const hasCurrent = typeof payload.current_password === "string";
    const hasNew = typeof payload.new_password === "string";
    return hasCurrent === hasNew;
}, {
    message: "Both current_password and new_password are required to change password.",
    path: ["current_password"],
});
export const superAdminUpdateAdminBodySchema = z.object({
    full_name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(3).or(z.literal("")).optional(),
    bio: z.string().trim().max(2000).optional(),
    job_title: z.string().trim().max(120).optional(),
    avatar_url: z.string().trim().url().or(z.literal("")).optional(),
    linkedin_url: z.string().trim().url().or(z.literal("")).optional(),
    github_url: z.string().trim().url().or(z.literal("")).optional(),
    portfolio_url: z.string().trim().url().or(z.literal("")).optional(),
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

export const sendMessagingUsersBodySchema = z.object({
    channel: z.enum(["email", "sms"]),
    user_ids: z.array(z.coerce.number().int().positive()).min(1),
    subject: z.string().trim().min(1).optional(),
    body: z.string().trim().min(1),
}).strict();


