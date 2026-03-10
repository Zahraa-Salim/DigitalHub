// File: server/src/schemas/announcements.schemas.ts
// Purpose: Defines the Zod schemas for announcements.
// It describes the request shapes and validation rules used before service logic runs.

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
    event_id: z.number().int().positive().nullable().optional(),
    is_auto: z.boolean().optional(),
    is_published: z.boolean().optional(),
    publish_at: z.string().datetime().nullable().optional(),
})
    .refine((payload) => !(payload.cohort_id && payload.event_id), {
    message: "Link either a cohort or an event, not both.",
    path: ["event_id"],
})
    .strict();
export const announcementPatchSchema = z
    .object({
    title: z.string().trim().min(1).optional(),
    body: z.string().trim().min(1).optional(),
    target_audience: z.enum(["all", "website", "admin"]).optional(),
    cohort_id: z.number().int().positive().nullable().optional(),
    event_id: z.number().int().positive().nullable().optional(),
    is_auto: z.boolean().optional(),
    is_published: z.boolean().optional(),
    publish_at: z.string().datetime().nullable().optional(),
})
    .refine((payload) => !(payload.cohort_id && payload.event_id), {
    message: "Link either a cohort or an event, not both.",
    path: ["event_id"],
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });

