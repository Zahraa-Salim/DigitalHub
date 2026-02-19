// File Summary: server/src/schemas/cms.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();
export const siteSettingsPatchSchema = z
    .object({
    site_name: z.string().trim().min(1).optional(),
    default_event_location: z.string().trim().min(1).optional(),
    contact_info: z.record(z.string(), z.unknown()).optional(),
    social_links: z.record(z.string(), z.unknown()).optional(),
})
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
});
export const pagePatchSchema = z
    .object({
    title: z.string().trim().min(1).optional(),
    content: z.record(z.string(), z.unknown()).optional(),
    is_published: z.boolean().optional(),
})
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
});
export const homeSectionPatchSchema = z
    .object({
    title: z.string().trim().min(1).optional(),
    is_enabled: z.boolean().optional(),
    sort_order: z.number().int().optional(),
    content: z.record(z.string(), z.unknown()).optional(),
})
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
});
export const themeCreateSchema = z
    .object({
    key: z.string().trim().min(1),
    purpose: z.string().trim().min(1),
    value: z.string().trim().min(1),
    scope: z.enum(["global", "web", "admin"]).default("global"),
})
    .strict();
export const themePatchSchema = z
    .object({
    key: z.string().trim().min(1).optional(),
    purpose: z.string().trim().min(1).optional(),
    value: z.string().trim().min(1).optional(),
    scope: z.enum(["global", "web", "admin"]).optional(),
})
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
});


