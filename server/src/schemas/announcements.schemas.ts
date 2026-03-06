// File Summary: server/src/schemas/announcements.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();
export const announcementCreateSchema = z
    .object({
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
    target_audience: z.enum(["all", "website", "admin"]).default("all"),
    cohort_id: z.number().int().positive().nullable().optional(),
    is_auto: z.boolean().optional(),
    is_published: z.boolean().optional(),
    publish_at: z.string().datetime().nullable().optional(),
})
    .strict();
export const announcementPatchSchema = z
    .object({
    title: z.string().trim().min(1).optional(),
    body: z.string().trim().min(1).optional(),
    target_audience: z.enum(["all", "website", "admin"]).optional(),
    cohort_id: z.number().int().positive().nullable().optional(),
    is_auto: z.boolean().optional(),
    is_published: z.boolean().optional(),
    publish_at: z.string().datetime().nullable().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });


