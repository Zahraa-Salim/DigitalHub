// File Summary: server/src/schemas/attendance.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for attendance route validation.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";

const attendanceStatusSchema = z.enum(["present", "absent", "late"]);
const locationTypeSchema = z.enum(["remote", "on_site"]);

export const attendanceSheetQuerySchema = z
  .object({
    cohort_id: z.coerce.number().int().positive(),
    date: z.string().date().optional(),
  })
  .strict();

export const attendanceSheetSaveSchema = z
  .object({
    cohort_id: z.coerce.number().int().positive(),
    attendance_date: z.string().date(),
    location_type: locationTypeSchema,
    records: z
      .array(
        z
          .object({
            student_user_id: z.coerce.number().int().positive(),
            status: attendanceStatusSchema,
            note: z.string().trim().max(1000).nullable().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const studentAttendanceParamsSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
  })
  .strict();

export const studentAttendanceQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(120).optional(),
  })
  .strict();
