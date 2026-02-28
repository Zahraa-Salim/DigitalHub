// File Summary: server/src/schemas/programApplications.schemas.ts
// Layer: schemas
// Purpose: Defines Zod schemas used for request validation in route handlers.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { z } from "zod";

export const stageSchema = z.enum([
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "rejected",
  "participation_confirmed",
]);

export const programApplicationIdParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const programApplicationMessageParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    messageId: z.coerce.number().int().positive(),
  })
  .strict();

export const programApplicationRetryMessageParamsSchema = z
  .object({
    messageId: z.coerce.number().int().positive(),
  })
  .strict();

export const programApplicationsListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    sortBy: z.enum(["created_at", "updated_at", "stage"]).default("created_at").optional(),
    order: z.enum(["asc", "desc"]).default("desc").optional(),
    stage: stageSchema.optional(),
    status: stageSchema.optional(),
    program_id: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).optional(),
  })
  .strict();

export const programApplicationStagePatchSchema = z
  .object({
    stage: stageSchema.optional(),
    status: stageSchema.optional(),
    review_message: z.string().trim().max(4000).optional(),
  })
  .refine((payload) => Boolean(payload.stage || payload.status), {
    message: "stage or status is required",
    path: ["stage"],
  })
  .strict();

export const programApplicationInterviewScheduleSchema = z
  .object({
    scheduled_at: z.string().datetime(),
    duration_minutes: z.number().int().min(5).max(240).optional(),
    location_type: z.enum(["online", "in_person", "phone"]),
    location_details: z.string().trim().max(1000).optional(),
    channels: z
      .object({
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const programApplicationInterviewCompleteSchema = z.object({}).strict();

export const programApplicationMessageCreateSchema = z
  .object({
    channel: z.enum(["email", "sms", "whatsapp"]),
    to_value: z.string().trim().min(1).optional(),
    subject: z.string().trim().min(1).optional(),
    body: z.string().trim().min(1),
    template_key: z.string().trim().min(1).optional(),
    sendNow: z.boolean().optional(),
  })
  .strict();

export const programApplicationDecisionSchema = z
  .object({
    decision: z.enum(["accepted", "rejected"]),
    channels: z
      .object({
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
      })
      .strict()
      .optional(),
    messageOverride: z.string().trim().min(1).optional(),
  })
  .strict();

export const programApplicationParticipationConfirmSchema = z
  .object({
    note: z.string().trim().max(4000).optional(),
  })
  .strict();

export const programApplicationCreateUserSchema = z.object({}).strict();

export const programApplicationMessageSendBodySchema = z.object({}).strict();
