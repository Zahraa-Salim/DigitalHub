// File Summary: server/src/schemas/applications.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
export const applicationCreateSchema = z
    .object({
    cohort_id: z.number().int().positive(),
    applicant: z
        .object({
        full_name: z.string().trim().min(1).optional(),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().min(1).optional(),
    })
        .refine((applicant) => Boolean(applicant.email?.trim() || applicant.phone?.trim()), {
        message: "At least one of email or phone is required.",
    })
        .strict(),
    form_id: z.number().int().positive().optional(),
    answers: z.record(z.string(), z.unknown()).optional(),
})
    .strict();
export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();
export const approveBodySchema = z
    .object({
    message: z.string().trim().min(1).optional(),
    send_email: z.boolean().optional(),
    send_phone: z.boolean().optional(),
})
    .strict();
export const rejectBodySchema = z
    .object({
    reason: z.string().trim().min(1).optional(),
    message: z.string().trim().min(1).optional(),
    send_email: z.boolean().optional(),
    send_phone: z.boolean().optional(),
})
    .strict();


