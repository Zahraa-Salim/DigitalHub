// File Summary: server/src/schemas/programs.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";
const attendanceDaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
const attendanceTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const idParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
}).strict();
export const programCreateSchema = z
    .object({
    slug: z.string().trim().min(1),
    title: z.string().trim().min(1),
    summary: z.string().trim().optional(),
    description: z.string().trim().optional(),
    requirements: z.string().trim().optional(),
    image_url: z.union([z.literal(""), z.string().trim().max(2048)]).nullable().optional(),
    default_capacity: z.number().int().min(0).optional(),
    is_published: z.boolean().optional(),
})
    .strict();
export const programPatchSchema = z
    .object({
    slug: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    summary: z.string().trim().optional(),
    description: z.string().trim().optional(),
    requirements: z.string().trim().optional(),
    image_url: z.union([z.literal(""), z.string().trim().max(2048)]).nullable().optional(),
    default_capacity: z.number().int().min(0).optional(),
    is_published: z.boolean().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });

export const programImageUploadSchema = z
    .object({
    filename: z.string().trim().min(1).max(120).optional(),
    mime_type: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
    data_base64: z.string().trim().min(1),
})
    .strict();
export const cohortStatusSchema = z.enum(["coming_soon", "open", "running", "completed", "cancelled"]);
export const cohortCreateSchema = z
    .object({
    program_id: z.number().int().positive(),
    name: z.string().trim().min(1),
    status: cohortStatusSchema.optional(),
    auto_announce: z.boolean().optional(),
    capacity: z.number().int().min(0).nullable().optional(),
    enrollment_open_at: z.string().datetime().nullable().optional(),
    enrollment_close_at: z.string().datetime().nullable().optional(),
    start_date: z.string().date().nullable().optional(),
    end_date: z.string().date().nullable().optional(),
    attendance_days: z.array(attendanceDaySchema).min(1).max(7).optional(),
    attendance_start_time: attendanceTimeSchema.nullable().optional(),
    attendance_end_time: attendanceTimeSchema.nullable().optional(),
})
    .strict();
export const cohortPatchSchema = z
  .object({
    program_id: z.number().int().positive().optional(),
    name: z.string().trim().min(1).optional(),
    status: cohortStatusSchema.optional(),
    use_general_form: z.boolean().optional(),
    application_form_id: z.number().int().positive().nullable().optional(),
    auto_announce: z.boolean().optional(),
    capacity: z.number().int().min(0).nullable().optional(),
    enrollment_open_at: z.string().datetime().nullable().optional(),
    enrollment_close_at: z.string().datetime().nullable().optional(),
    start_date: z.string().date().nullable().optional(),
    end_date: z.string().date().nullable().optional(),
    attendance_days: z.array(attendanceDaySchema).min(1).max(7).optional(),
    attendance_start_time: attendanceTimeSchema.nullable().optional(),
    attendance_end_time: attendanceTimeSchema.nullable().optional(),
})
    .strict()
    .refine((payload) => Object.keys(payload).length > 0, { message: "At least one field is required." });
export const cohortInstructorBodySchema = z
    .object({
    instructor_user_id: z.number().int().positive(),
    cohort_role: z.string().trim().min(1).default("instructor"),
})
    .strict();


