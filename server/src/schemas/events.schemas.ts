// File Summary: server/src/schemas/events.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";

const imageUrlSchema = z.string().trim().min(1).max(2048);

export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();

export const eventSlugParamsSchema = z
    .object({
    slug: z.string().trim().min(1).max(180),
})
    .strict();
export const eventCreateSchema = z
    .object({
    slug: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
    post_body: z.string().trim().nullable().optional(),
    location: z.string().trim().nullable().optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime().nullable().optional(),
    is_published: z.boolean().optional(),
    completion_image_urls: z.array(imageUrlSchema).max(24).optional(),
})
    .strict();
export const eventPatchSchema = z
    .object({
    slug: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    post_body: z.string().trim().nullable().optional(),
    location: z.string().trim().nullable().optional(),
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().nullable().optional(),
    is_published: z.boolean().optional(),
    is_done: z.boolean().optional(),
    done_at: z.string().datetime().nullable().optional(),
    completion_image_urls: z.array(imageUrlSchema).max(24).optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });

export const eventImageUploadSchema = z
    .object({
    filename: z.string().trim().min(1).max(120).optional(),
    mime_type: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
    data_base64: z.string().trim().min(1),
})
    .strict();


