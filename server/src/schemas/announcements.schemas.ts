// File: server/src/schemas/announcements.schemas.ts
// Purpose: Defines the Zod schemas for announcements.
// It describes the request shapes and validation rules used before service logic runs.


import { z } from "zod";

const isValidCtaUrl = (value: string) => {
    const normalized = String(value || "").trim();
    if (!normalized) {
        return true;
    }
    return (/^https?:\/\//i.test(normalized) ||
        normalized.startsWith("/") ||
        normalized.startsWith("#") ||
        /^mailto:/i.test(normalized) ||
        /^tel:/i.test(normalized));
};
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
    cta_label: z.string().trim().min(1).max(120).nullable().optional(),
    cta_url: z.string().trim().min(1).max(1000).nullable().optional(),
    cta_open_in_new_tab: z.boolean().optional(),
})
    .refine((payload) => !(payload.cohort_id && payload.event_id), {
    message: "Link either a cohort or an event, not both.",
    path: ["event_id"],
})
    .refine((payload) => isValidCtaUrl(String(payload.cta_url || "")), {
    message: "CTA URL must be an absolute URL, site path, anchor, mailto, or tel link.",
    path: ["cta_url"],
})
    .refine((payload) => !payload.cta_label || Boolean(payload.cta_url), {
    message: "CTA URL is required when CTA label is provided.",
    path: ["cta_url"],
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
    cta_label: z.string().trim().min(1).max(120).nullable().optional(),
    cta_url: z.string().trim().min(1).max(1000).nullable().optional(),
    cta_open_in_new_tab: z.boolean().optional(),
})
    .refine((payload) => !(payload.cohort_id && payload.event_id), {
    message: "Link either a cohort or an event, not both.",
    path: ["event_id"],
})
    .refine((payload) => isValidCtaUrl(String(payload.cta_url || "")), {
    message: "CTA URL must be an absolute URL, site path, anchor, mailto, or tel link.",
    path: ["cta_url"],
})
    .refine((payload) => !payload.cta_label || Boolean(payload.cta_url), {
    message: "CTA URL is required when CTA label is provided.",
    path: ["cta_url"],
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });

export const announcementBroadcastSchema = z.object({
    channel: z.enum(["email", "whatsapp", "both"]),
    recipient_type: z.enum(["all_contacts", "manual"]).default("all_contacts"),
    manual_recipients: z.array(z.string().trim().min(1)).optional(),
    include_subscribers: z.boolean().optional(),
}).strict();

