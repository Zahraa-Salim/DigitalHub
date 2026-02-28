// File Summary: server/src/services/programApplications.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { withTransaction } from "../db/index.js";
import { ADMIN_ACTIONS } from "../constants/adminActions.js";
import {
  ensureApplicationParticipationToken,
  updateApplicationStageAndStatus,
} from "../repositories/applications.repo.js";
import { getMessageTemplateByKey } from "../repositories/messageTemplates.repo.js";
import {
  countProgramApplications,
  createProgramApplicationMessageDraft,
  createStudentUserForProgramApplication,
  ensureLinkedApplicationIdForProgramApplication,
  findUserByEmail,
  findUserByPhone,
  getProgramApplicationMessageById,
  getProgramApplicationMessageForSend,
  getInterviewByProgramApplicationId,
  getProgramApplicationById,
  getProgramApplicationForUpdate,
  listProgramApplicationMessages,
  listProgramApplications,
  markProgramApplicationMessageFailed,
  markProgramApplicationMessageSent,
  markProgramApplicationParticipationConfirmed,
  markProgramInterviewCompleted,
  programApplicationsTableExists,
  setProgramApplicationCreatedUser,
  setUserAsStudent,
  updateProgramApplicationStage,
  upsertEnrollmentFromProgramApplication,
  upsertInterviewByProgramApplicationId,
  upsertStudentProfile,
} from "../repositories/programApplications.repo.js";
import { AppError } from "../utils/appError.js";
import { buildPagination } from "../utils/pagination.js";
import { buildSearchClause } from "../utils/sql.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { sendDigitalHubEmail } from "../utils/mailer.js";
import { sendDigitalHubWhatsApp } from "../utils/whatsapp.js";

const STAGES = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "rejected",
  "participation_confirmed",
];

function normalizeReviewMessage(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildInterviewLinks(token) {
  const baseApi = (process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
  return {
    confirm_url: `${baseApi}/public/interviews/${token}/confirm`,
    reschedule_url: `${baseApi}/public/interviews/${token}/reschedule`,
  };
}

function buildParticipationConfirmLink(token) {
  const baseApi = (process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${baseApi}/public/participation/${token}/confirm`;
}

function buildLearnerSignInUrl() {
  return (
    process.env.LEARNER_SIGNIN_URL ||
    process.env.STUDENT_SIGNIN_URL ||
    process.env.PUBLIC_STUDENT_SIGNIN_URL ||
    "https://example.com/sign-in"
  );
}

function formatTemplateDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toUTCString();
}

function renderTemplateString(input, tokens) {
  return String(input ?? "").replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, rawKey) => {
    const key = String(rawKey || "").trim();
    if (!(key in tokens)) return match;
    const value = tokens[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

async function buildProgramApplicationMessageTokens(programApplicationId, client) {
  const [applicationResult, interviewResult] = await Promise.all([
    getProgramApplicationById(programApplicationId, client),
    getInterviewByProgramApplicationId(programApplicationId, client),
  ]);

  const application = applicationResult.rows[0] ?? null;
  const interview = interviewResult.rows[0] ?? null;
  const links =
    interview?.confirm_token
      ? buildInterviewLinks(interview.confirm_token)
      : { confirm_url: "", reschedule_url: "" };
  const linkedApplicationId = await ensureLinkedApplicationIdForProgramApplication(programApplicationId, client);
  let participationToken = "";
  let participationConfirmUrl = "";
  if (linkedApplicationId) {
    const generatedToken = crypto.randomBytes(24).toString("hex");
    const tokenResult = await ensureApplicationParticipationToken(
      linkedApplicationId,
      generatedToken,
      client,
    );
    participationToken =
      tokenResult.rows[0]?.participation_token ?? generatedToken;
    participationConfirmUrl = buildParticipationConfirmLink(participationToken);
  }

  return {
    name: application?.applicant_full_name ?? "Applicant",
    application_id: interview?.application_id ?? linkedApplicationId ?? "",
    program_application_id: application?.id ?? programApplicationId,
    scheduled_at: formatTemplateDate(interview?.scheduled_at ?? ""),
    duration_minutes: interview?.duration_minutes ?? "",
    location_type: interview?.location_type ?? "",
    location_details: interview?.location_details ?? "",
    confirm_token: interview?.confirm_token ?? "",
    confirm_url: links.confirm_url,
    reschedule_url: links.reschedule_url,
    participation_token: participationToken,
    participation_confirm_url: participationConfirmUrl,
  };
}

function sanitizeSortBy(value) {
  if (value === "updated_at" || value === "stage") {
    return value;
  }
  return "created_at";
}

function sanitizeOrder(value) {
  return value === "asc" ? "asc" : "desc";
}

function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function normalizePhone(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function isDbError(error, code) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function ensureProgramApplicationsReady(client = null) {
  const exists = await programApplicationsTableExists(client ?? undefined);
  if (!exists) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "program_applications table is missing. Run the required migration before using this endpoint.",
    );
  }
}

function toChannelStorage(channel) {
  if (channel === "whatsapp") {
    return {
      channel: "sms",
      metadata: { provider: "whatsapp" },
    };
  }
  if (channel === "sms") {
    return {
      channel: "sms",
      metadata: {},
    };
  }
  return {
    channel: "email",
    metadata: {},
  };
}

async function sendAccountCredentialsMessageForProgramApplication(
  programApplicationId,
  application,
  actorUserId,
  generatedPassword,
  client,
) {
  const templateResult = await getMessageTemplateByKey("account_credentials", client);
  const template = templateResult.rows[0] ?? null;
  const signInUrl = buildLearnerSignInUrl();
  const bodyTokens = {
    name: application.applicant_full_name || "Student",
    email: application.applicant_email || "",
    phone: application.applicant_phone || "",
    generated_password: generatedPassword || "",
    sign_in_url: signInUrl,
  };
  const subject = renderTemplateString(
    template?.subject || "Your Digital Hub Account Details",
    bodyTokens,
  );
  const body = renderTemplateString(
    template?.body ||
      "Hello {name},\n\nYour account has been created.\nEmail: {email}\nPassword: {generated_password}\nSign in: {sign_in_url}\n",
    bodyTokens,
  );

  const emailValue = String(application.applicant_email || "").trim();
  const phoneValue = String(application.applicant_phone || "").trim();
  const useEmail = Boolean(emailValue) && !emailValue.endsWith("@digitalhub.local");
  const useWhatsApp = !useEmail && Boolean(phoneValue);

  const sentMessages = [];
  const failedMessages = [];

  if (!useEmail && !useWhatsApp) {
    return { sentMessages, failedMessages, skipped: true };
  }

  if (useEmail) {
    try {
      await sendDigitalHubEmail({ to: emailValue, subject, body });
      const created = await createProgramApplicationMessageDraft(
        {
          program_application_id: programApplicationId,
          channel: "email",
          to_value: emailValue,
          subject,
          body,
          template_key: "account_credentials",
          status: "sent",
          created_by: actorUserId,
        },
        client,
      );
      const messageId = created.rows[0]?.id;
      if (messageId) {
        await markProgramApplicationMessageSent(programApplicationId, messageId, subject, body, client);
        sentMessages.push({ channel: "email", to: emailValue, message_id: messageId });
      }
    } catch (error) {
      failedMessages.push({ channel: "email", to: emailValue, error: String(error?.message || error) });
      await createProgramApplicationMessageDraft(
        {
          program_application_id: programApplicationId,
          channel: "email",
          to_value: emailValue,
          subject,
          body,
          template_key: "account_credentials",
          status: "failed",
          created_by: actorUserId,
        },
        client,
      );
    }
  }

  if (useWhatsApp) {
    try {
      await sendDigitalHubWhatsApp({ to: phoneValue, body });
      const created = await createProgramApplicationMessageDraft(
        {
          program_application_id: programApplicationId,
          channel: "sms",
          to_value: phoneValue,
          subject: null,
          body,
          template_key: "account_credentials",
          status: "sent",
          created_by: actorUserId,
          metadata: { provider: "whatsapp" },
        },
        client,
      );
      const messageId = created.rows[0]?.id;
      if (messageId) {
        await markProgramApplicationMessageSent(programApplicationId, messageId, null, body, client);
        sentMessages.push({ channel: "sms", to: phoneValue, message_id: messageId });
      }
    } catch (error) {
      failedMessages.push({ channel: "sms", to: phoneValue, error: String(error?.message || error) });
      await createProgramApplicationMessageDraft(
        {
          program_application_id: programApplicationId,
          channel: "sms",
          to_value: phoneValue,
          subject: null,
          body,
          template_key: "account_credentials",
          status: "failed",
          created_by: actorUserId,
          metadata: { provider: "whatsapp" },
        },
        client,
      );
    }
  }

  return { sentMessages, failedMessages, skipped: false };
}

export async function listProgramApplicationsService(query) {
  await ensureProgramApplicationsReady();
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
  const offset = (page - 1) * limit;
  const sortBy = sanitizeSortBy(query.sortBy);
  const order = sanitizeOrder(query.order);

  const where = [];
  const params = [];

  const stage = query.stage ?? query.status;
  if (stage) {
    params.push(stage);
    where.push(`pa.stage = $${params.length}`);
  }

  if (query.program_id) {
    params.push(Number(query.program_id));
    where.push(`pa.program_id = $${params.length}`);
  }

  if (query.search) {
    params.push(`%${String(query.search).trim()}%`);
    where.push(
      buildSearchClause(
        [
          "COALESCE(ap.full_name, '')",
          "COALESCE(ap.email, '')",
          "COALESCE(ap.phone, '')",
        ],
        params.length,
      ),
    );
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await countProgramApplications(whereClause, params);
  const listResult = await listProgramApplications(whereClause, sortBy, order, params, limit, offset);

  const total = Number(countResult.rows[0]?.total ?? 0);
  return {
    data: listResult.rows,
    pagination: buildPagination(page, limit, total),
  };
}

export async function getProgramApplicationDetailService(programApplicationId) {
  await ensureProgramApplicationsReady();
  const [applicationResult, interviewResult, messagesResult] = await Promise.all([
    getProgramApplicationById(programApplicationId),
    getInterviewByProgramApplicationId(programApplicationId),
    listProgramApplicationMessages(programApplicationId),
  ]);

  if (!applicationResult.rowCount) {
    throw new AppError(404, "PROGRAM_APPLICATION_NOT_FOUND", "Program application not found.");
  }

  const row = applicationResult.rows[0];
  return {
    program_application: row,
    applicant: row.applicant_id
      ? {
          id: row.applicant_id,
          full_name: row.applicant_full_name,
          email: row.applicant_email,
          phone: row.applicant_phone,
        }
      : null,
    program: {
      id: row.program_id,
      slug: row.program_slug,
      title: row.program_title,
      summary: row.program_summary,
      description: row.program_description,
      requirements: row.program_requirements,
      default_capacity: row.program_default_capacity,
    },
    interview: interviewResult.rowCount ? interviewResult.rows[0] : null,
    messages: messagesResult.rows,
  };
}

export async function patchProgramApplicationStageService(programApplicationId, actorUserId, payload) {
  return withTransaction(async (client) => {
    await ensureProgramApplicationsReady(client);
    const nextStage = payload.stage ?? payload.status;
    if (!nextStage || !STAGES.includes(nextStage)) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid stage/status value.");
    }
    const currentResult = await getProgramApplicationForUpdate(programApplicationId, client);
    if (!currentResult.rowCount) {
      throw new AppError(404, "PROGRAM_APPLICATION_NOT_FOUND", "Program application not found.");
    }

    const reviewMessage = normalizeReviewMessage(payload.review_message);
    const updated = await updateProgramApplicationStage(
      programApplicationId,
      nextStage,
      actorUserId,
      reviewMessage,
      client,
    );

    const linkedApplicationId = await ensureLinkedApplicationIdForProgramApplication(
      programApplicationId,
      client,
    );
    if (linkedApplicationId) {
      await updateApplicationStageAndStatus(
        linkedApplicationId,
        nextStage,
        nextStage,
        actorUserId,
        reviewMessage,
        client,
      );
    }

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_STAGE_CHANGED,
        entityType: "program_applications",
        entityId: programApplicationId,
        message: `Program application ${programApplicationId} stage changed to ${nextStage}.`,
        metadata: {
          from_stage: currentResult.rows[0].stage,
          to_stage: nextStage,
          review_message: reviewMessage,
        },
        title: "Program Application Stage Updated",
        body: `Program application #${programApplicationId} moved to '${nextStage}'.`,
      },
      client,
    );

    return updated.rows[0];
  });
}

export async function scheduleProgramApplicationInterviewService(programApplicationId, actorUserId, payload) {
  return withTransaction(async (client) => {
    await ensureProgramApplicationsReady(client);
    const applicationResult = await getProgramApplicationForUpdate(programApplicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "PROGRAM_APPLICATION_NOT_FOUND", "Program application not found.");
    }

    const application = applicationResult.rows[0];
    const linkedApplicationId = await ensureLinkedApplicationIdForProgramApplication(
      programApplicationId,
      client,
    );
    const confirmToken = crypto.randomBytes(24).toString("hex");
    const links = buildInterviewLinks(confirmToken);

    const interviewResult = await upsertInterviewByProgramApplicationId(
      {
        program_application_id: programApplicationId,
        application_id: linkedApplicationId ?? null,
        scheduled_at: payload.scheduled_at,
        duration_minutes: payload.duration_minutes ?? 30,
        location_type: payload.location_type,
        location_details: payload.location_details ?? null,
        confirm_token: confirmToken,
        created_by: actorUserId,
      },
      client,
    );

    const stageResult = await updateProgramApplicationStage(
      programApplicationId,
      "invited_to_interview",
      actorUserId,
      null,
      client,
    );

    const channels = payload.channels ?? {};
    const drafts = [];

    if (channels.email) {
      const toValue = application.applicant_email;
      if (!toValue) {
        throw new AppError(400, "VALIDATION_ERROR", "Applicant email is required to create an email draft.");
      }

      const created = await createProgramApplicationMessageDraft(
        {
          program_application_id: programApplicationId,
          channel: "email",
          to_value: toValue,
          subject: "Interview Invitation",
          body:
            `Dear ${application.applicant_full_name || "Applicant"},\n\n` +
            `Your interview has been scheduled on ${new Date(payload.scheduled_at).toUTCString()}.\n` +
            `Duration: ${interviewResult.rows[0].duration_minutes} minutes\n` +
            `Location Type: ${interviewResult.rows[0].location_type}\n` +
            `Location Details: ${interviewResult.rows[0].location_details || "-"}\n` +
            `Application ID: ${programApplicationId}\n` +
            `Confirm Token: ${confirmToken}\n` +
            `Confirm here: ${links.confirm_url}\n` +
            `Reschedule here: ${links.reschedule_url}\n\n` +
            "Best regards,\nAdmissions Team",
          template_key: "interview_scheduling",
          status: "draft",
          created_by: actorUserId,
        },
        client,
      );
      drafts.push(created.rows[0]);
    }

    const sendWhatsApp = Boolean(channels.whatsapp || channels.sms);
    if (sendWhatsApp) {
      const toValue = application.applicant_phone;
      if (!toValue) {
        throw new AppError(400, "VALIDATION_ERROR", "Applicant phone is required to create a WhatsApp draft.");
      }

      const created = await createProgramApplicationMessageDraft(
        {
          program_application_id: programApplicationId,
          channel: "sms",
          to_value: toValue,
          subject: null,
          body:
            `Interview: ${new Date(payload.scheduled_at).toUTCString()} | ` +
            `${interviewResult.rows[0].location_type} | ${interviewResult.rows[0].location_details || "-"} | ` +
            `App#${programApplicationId} | Token:${confirmToken} | Confirm: ${links.confirm_url} | Reschedule: ${links.reschedule_url}`,
          template_key: "interview_scheduling",
          status: "draft",
          created_by: actorUserId,
          metadata: { provider: "whatsapp" },
        },
        client,
      );
      drafts.push(created.rows[0]);
    }

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.INTERVIEW_SCHEDULED,
        entityType: "interviews",
        entityId: interviewResult.rows[0].id,
        message: `Interview scheduled for program application ${programApplicationId}.`,
        metadata: {
          program_application_id: programApplicationId,
          scheduled_at: interviewResult.rows[0].scheduled_at,
          channels: Object.keys(channels).filter((key) => channels[key]),
          message_draft_count: drafts.length,
        },
        title: "Program Interview Scheduled",
        body: `Interview scheduled for program application #${programApplicationId}.`,
      },
      client,
    );

    return {
      program_application: stageResult.rows[0],
      interview: interviewResult.rows[0],
      message_drafts: drafts,
      links,
    };
  });
}

export async function markProgramApplicationInterviewCompletedService(programApplicationId, actorUserId) {
  return withTransaction(async (client) => {
    await ensureProgramApplicationsReady(client);
    const appResult = await getProgramApplicationForUpdate(programApplicationId, client);
    if (!appResult.rowCount) {
      throw new AppError(404, "PROGRAM_APPLICATION_NOT_FOUND", "Program application not found.");
    }

    const interviewResult = await markProgramInterviewCompleted(programApplicationId, client);
    if (!interviewResult.rowCount) {
      throw new AppError(404, "INTERVIEW_NOT_FOUND", "Interview not found for this program application.");
    }

    const stageResult = await updateProgramApplicationStage(
      programApplicationId,
      "interview_confirmed",
      actorUserId,
      null,
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.INTERVIEW_COMPLETED,
        entityType: "interviews",
        entityId: interviewResult.rows[0].id,
        message: `Interview marked completed for program application ${programApplicationId}.`,
        metadata: { program_application_id: programApplicationId },
        title: "Program Interview Completed",
        body: `Interview completed for program application #${programApplicationId}.`,
      },
      client,
    );

    return {
      program_application: stageResult.rows[0],
      interview: interviewResult.rows[0],
    };
  });
}

export async function listProgramApplicationMessagesService(programApplicationId) {
  await ensureProgramApplicationsReady();
  const [applicationResult, messagesResult] = await Promise.all([
    getProgramApplicationById(programApplicationId),
    listProgramApplicationMessages(programApplicationId),
  ]);

  if (!applicationResult.rowCount) {
    throw new AppError(404, "PROGRAM_APPLICATION_NOT_FOUND", "Program application not found.");
  }

  return {
    program_application_id: programApplicationId,
    messages: messagesResult.rows,
  };
}

export async function createProgramApplicationMessageService(programApplicationId, actorUserId, payload) {
  return withTransaction(async (client) => {
    await ensureProgramApplicationsReady(client);
    const applicationResult = await getProgramApplicationForUpdate(programApplicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "PROGRAM_APPLICATION_NOT_FOUND", "Program application not found.");
    }

    const application = applicationResult.rows[0];
    const channelStorage = toChannelStorage(payload.channel);
    const toValue =
      payload.to_value ||
      (channelStorage.channel === "email" ? application.applicant_email : application.applicant_phone);

    if (!toValue) {
      throw new AppError(400, "VALIDATION_ERROR", `No destination found for ${payload.channel}.`);
    }

    const created = await createProgramApplicationMessageDraft(
      {
        program_application_id: programApplicationId,
        channel: channelStorage.channel,
        to_value: toValue,
        subject: payload.subject ?? null,
        body: payload.body,
        template_key: payload.template_key ?? null,
        status: "draft",
        created_by: actorUserId,
        metadata: channelStorage.metadata,
      },
      client,
    );

    let finalMessage = created.rows[0];
    let sendError = null;
    if (payload.sendNow) {
      const tokens = await buildProgramApplicationMessageTokens(programApplicationId, client);
      const renderedSubject = renderTemplateString(created.rows[0].subject || "Digital Hub Message", tokens);
      const renderedBody = renderTemplateString(created.rows[0].body, tokens);
      try {
        if (channelStorage.channel === "email") {
          await sendDigitalHubEmail({
            to: created.rows[0].to_value,
            subject: renderedSubject,
            body: renderedBody,
          });
        } else {
          await sendDigitalHubWhatsApp({
            to: created.rows[0].to_value,
            body: renderedBody,
          });
        }

        const sentResult = await markProgramApplicationMessageSent(
          programApplicationId,
          Number(created.rows[0].id),
          renderedSubject,
          renderedBody,
          client,
        );
        finalMessage = {
          ...(sentResult.rows[0] ?? created.rows[0]),
          subject: renderedSubject,
          body: renderedBody,
        };
      } catch (error) {
        sendError = String(error?.message || error);
        const failedResult = await markProgramApplicationMessageFailed(
          programApplicationId,
          Number(created.rows[0].id),
          sendError,
          renderedSubject,
          renderedBody,
          client,
        );
        finalMessage = {
          ...(failedResult.rows[0] ?? created.rows[0]),
          subject: renderedSubject,
          body: renderedBody,
        };
      }
    }

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_MESSAGE_DRAFT_CREATED,
        entityType: "application_messages",
        entityId: created.rows[0].id,
        message: `Message draft created for program application ${programApplicationId}.`,
        metadata: {
          program_application_id: programApplicationId,
          channel: payload.channel,
          send_now: Boolean(payload.sendNow),
          send_error: sendError,
        },
        title: "Program Application Message Draft Created",
        body: `A ${payload.channel} draft was created for program application #${programApplicationId}.`,
      },
      client,
    );

    if (payload.sendNow) {
      await logAdminAction(
        {
          actorUserId,
          action: ADMIN_ACTIONS.APPLICATION_MESSAGE_SENT,
          entityType: "application_messages",
          entityId: finalMessage.id ?? created.rows[0].id,
          message:
            finalMessage.status === "sent"
              ? `Message ${finalMessage.id ?? created.rows[0].id} sent for program application ${programApplicationId}.`
              : `Message ${finalMessage.id ?? created.rows[0].id} failed for program application ${programApplicationId}.`,
          metadata: {
            program_application_id: programApplicationId,
            channel: finalMessage.channel ?? channelStorage.channel,
            status: finalMessage.status ?? "draft",
            error: sendError,
          },
          title: finalMessage.status === "sent" ? "Program Application Message Sent" : "Program Application Message Failed",
          body:
            finalMessage.status === "sent"
              ? `A message was sent for program application #${programApplicationId}.`
              : `A message failed for program application #${programApplicationId}.`,
        },
        client,
      );
    }

    return finalMessage;
  });
}

export async function sendProgramApplicationMessageService(programApplicationId, messageId, actorUserId) {
  return withTransaction(async (client) => {
    await ensureProgramApplicationsReady(client);
    const draftResult = await getProgramApplicationMessageForSend(programApplicationId, messageId, client);
    if (!draftResult.rowCount) {
      throw new AppError(404, "MESSAGE_NOT_FOUND", "Message draft not found for this program application.");
    }

    const draft = draftResult.rows[0];
    if (!["draft", "failed"].includes(String(draft.status || "draft"))) {
      throw new AppError(409, "VALIDATION_ERROR", "Only draft or failed messages can be sent.");
    }
    const tokens = await buildProgramApplicationMessageTokens(programApplicationId, client);
    const renderedSubject = renderTemplateString(draft.subject || "Digital Hub Message", tokens);
    const renderedBody = renderTemplateString(draft.body, tokens);
    try {
      if (draft.channel === "email") {
        await sendDigitalHubEmail({
          to: draft.to_value,
          subject: renderedSubject,
          body: renderedBody,
        });
      } else if (draft.channel === "sms") {
        await sendDigitalHubWhatsApp({
          to: draft.to_value,
          body: renderedBody,
        });
      }

      const sentResult = await markProgramApplicationMessageSent(
        programApplicationId,
        messageId,
        renderedSubject,
        renderedBody,
        client,
      );
      const sentMessage = {
        ...(sentResult.rows[0] ?? draft),
        subject: renderedSubject,
        body: renderedBody,
      };

      await logAdminAction(
        {
          actorUserId,
          action: ADMIN_ACTIONS.APPLICATION_MESSAGE_SENT,
          entityType: "application_messages",
          entityId: sentMessage.id,
          message: `Message ${sentMessage.id} marked as sent for program application ${programApplicationId}.`,
          metadata: {
            program_application_id: programApplicationId,
            channel: sentMessage.channel,
          },
          title: "Program Application Message Sent",
          body: `A ${sentMessage.channel} message was sent for program application #${programApplicationId}.`,
        },
        client,
      );

      return sentMessage;
    } catch (error) {
      const failedResult = await markProgramApplicationMessageFailed(
        programApplicationId,
        messageId,
        String(error?.message || error),
        renderedSubject,
        renderedBody,
        client,
      );
      const failedMessage = {
        ...(failedResult.rows[0] ?? draft),
        subject: renderedSubject,
        body: renderedBody,
      };
      await logAdminAction(
        {
          actorUserId,
          action: ADMIN_ACTIONS.APPLICATION_MESSAGE_SENT,
          entityType: "application_messages",
          entityId: failedMessage.id,
          message: `Message ${failedMessage.id} failed to send for program application ${programApplicationId}.`,
          metadata: {
            program_application_id: programApplicationId,
            channel: failedMessage.channel,
            status: "failed",
            error: String(error?.message || error),
          },
          title: "Program Application Message Failed",
          body: `A ${failedMessage.channel} message failed for program application #${programApplicationId}.`,
        },
        client,
      );
      return failedMessage;
    }
  });
}

export async function retryProgramApplicationMessageService(messageId, actorUserId) {
  await ensureProgramApplicationsReady();
  const messageResult = await getProgramApplicationMessageById(messageId);
  if (!messageResult.rowCount) {
    throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found.");
  }

  const message = messageResult.rows[0];
  if (!["draft", "failed"].includes(String(message.status || ""))) {
    throw new AppError(409, "VALIDATION_ERROR", "Only draft or failed messages can be retried.");
  }

  return sendProgramApplicationMessageService(Number(message.program_application_id), messageId, actorUserId);
}

export async function decideProgramApplicationService(programApplicationId, actorUserId, payload) {
  return withTransaction(async (client) => {
    await ensureProgramApplicationsReady(client);
    const applicationResult = await getProgramApplicationForUpdate(programApplicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "PROGRAM_APPLICATION_NOT_FOUND", "Program application not found.");
    }

    const decision = payload.decision;
    const nextStage = decision === "accepted" ? "accepted" : "rejected";
    const updated = await updateProgramApplicationStage(
      programApplicationId,
      nextStage,
      actorUserId,
      payload.messageOverride ?? null,
      client,
    );

    const linkedApplicationId = await ensureLinkedApplicationIdForProgramApplication(
      programApplicationId,
      client,
    );
    if (linkedApplicationId) {
      await updateApplicationStageAndStatus(
        linkedApplicationId,
        nextStage,
        nextStage,
        actorUserId,
        payload.messageOverride ?? null,
        client,
      );
    }

    const channels = payload.channels ?? {};
    const drafts = [];
    if (channels.email) {
      const toValue = applicationResult.rows[0].applicant_email;
      if (!toValue) {
        throw new AppError(400, "VALIDATION_ERROR", "Applicant email is required to create an email draft.");
      }

      const subject = decision === "accepted" ? "Application Accepted" : "Application Rejected";
      const defaultBody =
        decision === "accepted"
          ? "Your application has been accepted. If you are sure you want to join, please confirm here: {participation_confirm_url}"
          : "Thank you for applying. Your application was not selected this round.";

      const created = await createProgramApplicationMessageDraft(
        {
          program_application_id: programApplicationId,
          channel: "email",
          to_value: toValue,
          subject,
          body: payload.messageOverride ?? defaultBody,
          template_key: decision === "accepted" ? "decision_accepted" : "decision_rejected",
          status: "draft",
          created_by: actorUserId,
        },
        client,
      );
      drafts.push(created.rows[0]);
    }

    const sendWhatsApp = Boolean(channels.whatsapp || channels.sms);
    if (sendWhatsApp) {
      const toValue = applicationResult.rows[0].applicant_phone;
      if (!toValue) {
        throw new AppError(400, "VALIDATION_ERROR", "Applicant phone is required to create a WhatsApp draft.");
      }

      const defaultBody =
        decision === "accepted"
          ? "Your application has been accepted. Confirm participation: {participation_confirm_url}"
          : "Your application was not selected this round.";
      const created = await createProgramApplicationMessageDraft(
        {
          program_application_id: programApplicationId,
          channel: "sms",
          to_value: toValue,
          subject: null,
          body: payload.messageOverride ?? defaultBody,
          template_key: decision === "accepted" ? "decision_accepted" : "decision_rejected",
          status: "draft",
          created_by: actorUserId,
          metadata: { provider: "whatsapp" },
        },
        client,
      );
      drafts.push(created.rows[0]);
    }

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_DECISION_SET,
        entityType: "program_applications",
        entityId: programApplicationId,
        message: `Decision '${decision}' recorded for program application ${programApplicationId}.`,
        metadata: {
          decision,
          to_stage: nextStage,
          message_draft_count: drafts.length,
        },
        title: "Program Application Decision Recorded",
        body: `Decision '${decision}' was recorded for program application #${programApplicationId}.`,
      },
      client,
    );

    return {
      program_application: updated.rows[0],
      message_drafts: drafts,
    };
  });
}

export async function confirmProgramApplicationParticipationService(programApplicationId, actorUserId, payload) {
  return withTransaction(async (client) => {
    await ensureProgramApplicationsReady(client);
    const applicationResult = await getProgramApplicationForUpdate(programApplicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "PROGRAM_APPLICATION_NOT_FOUND", "Program application not found.");
    }

    const updated = await markProgramApplicationParticipationConfirmed(
      programApplicationId,
      actorUserId,
      normalizeReviewMessage(payload.note),
      client,
    );

    const linkedApplicationId = await ensureLinkedApplicationIdForProgramApplication(
      programApplicationId,
      client,
    );
    if (linkedApplicationId) {
      await updateApplicationStageAndStatus(
        linkedApplicationId,
        "participation_confirmed",
        "participation_confirmed",
        actorUserId,
        normalizeReviewMessage(payload.note),
        client,
      );
    }

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.PARTICIPATION_CONFIRMED,
        entityType: "program_applications",
        entityId: programApplicationId,
        message: `Participation confirmed for program application ${programApplicationId}.`,
        metadata: {
          from_stage: applicationResult.rows[0].stage,
          to_stage: "participation_confirmed",
          note: payload.note ?? null,
        },
        title: "Program Application Participation Confirmed",
        body: `Participation confirmed for program application #${programApplicationId}.`,
      },
      client,
    );

    return updated.rows[0];
  });
}

export async function createUserFromProgramApplicationService(programApplicationId, actorUserId) {
  return withTransaction(async (client) => {
    await ensureProgramApplicationsReady(client);
    const applicationResult = await getProgramApplicationForUpdate(programApplicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "PROGRAM_APPLICATION_NOT_FOUND", "Program application not found.");
    }

    const application = applicationResult.rows[0];

    if (application.created_user_id) {
      return {
        program_application: application,
        user_id: application.created_user_id,
        enrollment: null,
        generated_password: null,
      };
    }

    const email = normalizeEmail(application.applicant_email ?? application.applicant_email_norm);
    const phone = normalizePhone(application.applicant_phone ?? application.applicant_phone_norm);
    const fallbackEmail = email || (!phone ? `program-application-${programApplicationId}@digitalhub.local` : null);
    const fallbackPhone = phone;

    let existingUserResult = null;
    if (fallbackEmail) {
      existingUserResult = await findUserByEmail(fallbackEmail, client);
    }
    if ((!existingUserResult || !existingUserResult.rowCount) && fallbackPhone) {
      existingUserResult = await findUserByPhone(fallbackPhone, client);
    }

    let userId;
    let generatedPassword = null;
    if (existingUserResult && existingUserResult.rowCount) {
      userId = Number(existingUserResult.rows[0].id);
      if (!existingUserResult.rows[0].is_student) {
        await setUserAsStudent(userId, client);
      }
    } else {
      generatedPassword = `DH-${crypto.randomBytes(6).toString("hex")}`;
      const hash = await bcrypt.hash(generatedPassword, 10);
      try {
        const inserted = await createStudentUserForProgramApplication(fallbackEmail, fallbackPhone, hash, client);
        userId = Number(inserted.rows[0].id);
      } catch (error) {
        if (isDbError(error, "23505")) {
          const fallbackResult = fallbackEmail ? await findUserByEmail(fallbackEmail, client) : await findUserByPhone(fallbackPhone, client);
          if (!fallbackResult.rowCount) throw error;
          userId = Number(fallbackResult.rows[0].id);
          if (!fallbackResult.rows[0].is_student) {
            await setUserAsStudent(userId, client);
          }
        } else {
          throw error;
        }
      }
    }

    await upsertStudentProfile(userId, application.applicant_full_name ?? "Student", client);
    const updatedProgramApplication = await setProgramApplicationCreatedUser(programApplicationId, userId, client);

    let enrollment = null;
    if (application.cohort_id) {
      const enrollmentResult = await upsertEnrollmentFromProgramApplication(userId, application.cohort_id, client);
      enrollment = enrollmentResult.rows[0] ?? null;
    }

    const onboardingMessage = await sendAccountCredentialsMessageForProgramApplication(
      programApplicationId,
      application,
      actorUserId,
      generatedPassword,
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.USER_CREATED_FROM_APPLICATION,
        entityType: "program_applications",
        entityId: programApplicationId,
        message: `User created from program application ${programApplicationId}.`,
        metadata: {
          user_id: userId,
          cohort_id: application.cohort_id,
          enrollment_id: enrollment?.id ?? null,
          onboarding_message: onboardingMessage,
        },
        title: "User Created From Program Application",
        body: `A user account was created from program application #${programApplicationId}.`,
      },
      client,
    );

    return {
      program_application: updatedProgramApplication.rows[0],
      user_id: userId,
      enrollment,
      generated_password: generatedPassword,
      onboarding_message: onboardingMessage,
    };
  });
}
