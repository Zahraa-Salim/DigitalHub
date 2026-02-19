// File Summary: server/src/schemas/profiles.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const userIdParamsSchema = z.object({
    userId: z.coerce.number().int().positive(),
}).strict();
export const visibilitySchema = z.object({
    is_public: z.boolean(),
}).strict();
export const studentPatchSchema = z
    .object({
    full_name: z.string().trim().min(1).optional(),
    avatar_url: z.string().trim().url().nullable().optional(),
    bio: z.string().trim().nullable().optional(),
    linkedin_url: z.string().trim().url().nullable().optional(),
    github_url: z.string().trim().url().nullable().optional(),
    portfolio_url: z.string().trim().url().nullable().optional(),
    featured: z.boolean().optional(),
    featured_rank: z.number().int().nullable().optional(),
    public_slug: z.string().trim().min(1).nullable().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });
export const instructorPatchSchema = z
    .object({
    full_name: z.string().trim().min(1).optional(),
    avatar_url: z.string().trim().url().nullable().optional(),
    bio: z.string().trim().nullable().optional(),
    expertise: z.string().trim().nullable().optional(),
    linkedin_url: z.string().trim().url().nullable().optional(),
    github_url: z.string().trim().url().nullable().optional(),
    portfolio_url: z.string().trim().url().nullable().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });
export const managerPatchSchema = z
    .object({
    full_name: z.string().trim().min(1).optional(),
    avatar_url: z.string().trim().url().nullable().optional(),
    bio: z.string().trim().nullable().optional(),
    job_title: z.string().trim().nullable().optional(),
    linkedin_url: z.string().trim().url().nullable().optional(),
    github_url: z.string().trim().url().nullable().optional(),
    portfolio_url: z.string().trim().url().nullable().optional(),
    sort_order: z.number().int().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });


