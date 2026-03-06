// File Summary: server/src/schemas/events.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();
export const eventCreateSchema = z
    .object({
    slug: z.string().trim().min(1),
    title: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
    location: z.string().trim().nullable().optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime().nullable().optional(),
    is_published: z.boolean().optional(),
})
    .strict();
export const eventPatchSchema = z
    .object({
    slug: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    location: z.string().trim().nullable().optional(),
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().nullable().optional(),
    is_published: z.boolean().optional(),
    is_done: z.boolean().optional(),
    done_at: z.string().datetime().nullable().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });


