// File Summary: server/src/schemas/applications.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";

export const applicationStageSchema = z.enum([
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "rejected",
  "participation_confirmed",
]);
export const applicationStatusSchema = z.enum([
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "rejected",
  "participation_confirmed",
]);
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

export const stagePatchBodySchema = z
  .object({
    stage: applicationStageSchema.optional(),
    status: applicationStatusSchema.optional(),
    message: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.stage || value.status), {
    message: "stage or status is required",
    path: ["stage"],
  })
  .strict();

export const shortlistBodySchema = z.object({}).strict();

export const interviewScheduleBodySchema = z
  .object({
    scheduled_at: z.string().datetime(),
    duration_minutes: z.number().int().min(5).max(240).optional(),
    location_type: z.enum(["online", "in_person", "phone"]).optional(),
    location_details: z.string().trim().min(1).optional(),
    send_email: z.boolean().optional(),
    send_phone: z.boolean().optional(),
    email_subject: z.string().trim().min(1).optional(),
    email_body: z.string().trim().min(1).optional(),
    sms_body: z.string().trim().min(1).optional(),
  })
  .strict();

export const interviewCompleteBodySchema = z.object({}).strict();

export const decisionBodySchema = z
  .object({
    decision: z.enum(["accepted", "rejected"]),
    message: z.string().trim().min(1).optional(),
    send_email: z.boolean().optional(),
    send_phone: z.boolean().optional(),
    email_subject: z.string().trim().min(1).optional(),
    email_body: z.string().trim().min(1).optional(),
    sms_body: z.string().trim().min(1).optional(),
    message_drafts: z
      .array(
        z
          .object({
            channel: z.enum(["email", "sms"]),
            to_value: z.string().trim().min(1).optional(),
            subject: z.string().trim().min(1).optional(),
            body: z.string().trim().min(1),
            template_key: z.string().trim().min(1).optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const participationConfirmBodySchema = z.object({}).strict();
export const createUserBodySchema = z.object({}).strict();

export const messageCreateBodySchema = z
  .object({
    channel: z.enum(["email", "sms"]),
    to_value: z.string().trim().min(1),
    subject: z.string().trim().min(1).optional(),
    body: z.string().trim().min(1),
    template_key: z.string().trim().min(1).optional(),
  })
  .strict();

export const messageIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    messageId: z.coerce.number().int().positive(),
  })
  .strict();

export const interviewTokenParamsSchema = z
  .object({
    token: z.string().trim().min(8),
  })
  .strict();

export const publicInterviewConfirmBodySchema = z
  .object({
    note: z.string().trim().max(2000).optional(),
  })
  .strict();

export const publicInterviewRescheduleBodySchema = z
  .object({
    requested_at: z.string().datetime(),
    note: z.string().trim().max(2000).optional(),
  })
  .strict();

export const publicParticipationConfirmBodySchema = z
  .object({
    note: z.string().trim().max(2000).optional(),
  })
  .strict();

export const publicApplyBodySchema = z
  .object({
    program_id: z.coerce.number().int().positive(),
    answers: z.record(z.string(), z.unknown()),
  })
  .strict();


