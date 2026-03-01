// File Summary: server/src/schemas/contact.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const contactCreateSchema = z
    .object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().trim().optional(),
    subject: z.string().trim().optional(),
    message: z.string().trim().min(1),
    kind: z.enum(["question", "visit_request", "feedback"]).optional(),
    company_name: z.string().trim().optional(),
    company_role: z.string().trim().optional(),
    visit_preferred_dates: z.string().trim().optional(),
    visit_notes: z.string().trim().optional(),
})
    .strict();
export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();
export const statusPatchSchema = z
    .object({
    status: z.enum(["new", "in_progress", "resolved"]),
})
    .strict();
export const replyBodySchema = z
    .object({
    reply_message: z.string().trim().min(1),
    reply_subject: z.string().trim().min(1).max(300).optional(),
    template_key: z.string().trim().min(1).max(120).optional(),
})
    .strict();


