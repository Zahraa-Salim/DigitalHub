// File Summary: server/src/services/applications.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { withTransaction } from "../db/index.js";
import { ADMIN_ACTIONS } from "../constants/adminActions.js";
import {
  confirmInterviewByToken,
  countActiveEnrollmentsByCohort,
  countApplications,
  createApplicant,
  createApplication,
  createApplicationMessageDraft,
  createApplicationSubmission,
  createEnrollment,
  createStudentUser,
  ensureApplicationParticipationToken,
  findCohortFormResolution,
  findApplicationByParticipationTokenForUpdate,
  getApplicationMessageForSend,
  findInterviewByTokenForUpdate,
  findUserByEmail,
  findUserByPhone,
  getApplicationById,
  getApplicationForApproval,
  getApplicationForPipelineUpdate,
  getInterviewByApplicationId,
  listApplicationMessageDrafts,
  listApplications,
  markApplicationApproved,
  markApplicationMessageSent,
  markInterviewCompletedByApplicationId,
  rejectPendingApplication,
  requestInterviewRescheduleByToken,
  setApplicationCreatedUser,
  setUserAsStudent,
  updateApplicationStageAndStatus,
  updateApplicationStatusOnly,
  upsertInterviewByApplicationId,
  upsertStudentProfile,
} from "../repositories/applications.repo.js";
import { getMessageTemplateByKey } from "../repositories/messageTemplates.repo.js";
import {
  hasAcceptedProgramApplicationLinkedToApplication,
  markProgramApplicationParticipationConfirmedByLinkedApplicationId,
  updateProgramApplicationStageIfMatch,
} from "../repositories/programApplications.repo.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { sendDigitalHubEmail } from "../utils/mailer.js";
import { sendDigitalHubWhatsApp } from "../utils/whatsapp.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause } from "../utils/sql.js";

const GENERAL_COHORT_FORM_KEY = "cohort_application";
const LEGACY_COHORT_FORM_KEY = "general_application_form";

const APPLICATION_STAGES = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "rejected",
  "participation_confirmed",
  // Backward-compatibility aliases kept for older records/environments.
  "submitted",
  "reviewed",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "user_created",
];

const LEGACY_ONLY_STAGES = [
  "submitted",
  "reviewed",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "user_created",
];

const MODERN_ONLY_STAGES = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
];

const MODERN_TO_LEGACY_STAGE = {
  applied: "submitted",
  reviewing: "reviewed",
  invited_to_interview: "interview_scheduled",
  interview_confirmed: "interview_completed",
};

const LEGACY_TO_MODERN_STAGE = {
  submitted: "applied",
  reviewed: "reviewing",
  shortlisted: "reviewing",
  interview_scheduled: "invited_to_interview",
  interview_completed: "interview_confirmed",
  user_created: "participation_confirmed",
};

const APPLICATION_STATUSES = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "rejected",
  "participation_confirmed",
];

function normalizeReviewMessage(message) {
  if (typeof message !== "string") {
    return null;
  }

  const trimmed = message.trim();
  return trimmed ? trimmed : null;
}

function normalizeReviewOptions(input) {
  if (typeof input === "string") {
    return {
      reason: null,
      message: normalizeReviewMessage(input),
      send_email: false,
      send_phone: false,
    };
  }

  const value = typeof input === "object" && input !== null ? input : {};
  return {
    reason: typeof value.reason === "string" ? value.reason.trim() || null : null,
    message: normalizeReviewMessage(value.message),
    send_email: Boolean(value.send_email),
    send_phone: Boolean(value.send_phone),
  };
}

function normalizeStage(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const stage = String(value).trim();
  if (!APPLICATION_STAGES.includes(stage)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `Unsupported stage '${stage}'. Allowed: ${APPLICATION_STAGES.join(", ")}.`,
    );
  }

  return stage;
}

function mapStageToStatus(stage) {
  const normalizedStage = LEGACY_TO_MODERN_STAGE[stage] || stage;
  if (APPLICATION_STATUSES.includes(normalizedStage)) {
    return normalizedStage;
  }
  return "applied";
}

function mapLegacyStatusToStage(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "pending") return "applied";
  if (value === "waitlisted") return "reviewing";
  if (value === "approved") return "accepted";
  if (value === "rejected") return "rejected";
  if (APPLICATION_STATUSES.includes(value)) return value;
  return undefined;
}

function mapStageToLegacyStatus(stage) {
  const normalizedStage = LEGACY_TO_MODERN_STAGE[stage] || stage;
  if (normalizedStage === "rejected") return "rejected";
  if (normalizedStage === "accepted" || normalizedStage === "participation_confirmed") return "approved";
  if (
    normalizedStage === "reviewing" ||
    normalizedStage === "invited_to_interview" ||
    normalizedStage === "interview_confirmed"
  ) {
    return "waitlisted";
  }
  return "pending";
}

function normalizeStageForFamily(stage, currentStage) {
  const incoming = String(stage || "").trim();
  const existing = String(currentStage || "").trim();

  if (LEGACY_ONLY_STAGES.includes(existing)) {
    return MODERN_TO_LEGACY_STAGE[incoming] || incoming;
  }

  if (MODERN_ONLY_STAGES.includes(existing)) {
    return LEGACY_TO_MODERN_STAGE[incoming] || incoming;
  }

  return incoming;
}

function buildInterviewLinks(token) {
  const baseApi = (process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
  return {
    confirm_url: `${baseApi}/public/interviews/${token}/confirm`,
    reschedule_url: `${baseApi}/public/interviews/${token}/reschedule`,
  };
}

function buildLearnerSignInUrl() {
  return (
    process.env.LEARNER_SIGNIN_URL ||
    process.env.STUDENT_SIGNIN_URL ||
    process.env.PUBLIC_STUDENT_SIGNIN_URL ||
    "https://example.com/sign-in"
  );
}

function buildParticipationConfirmLink(token) {
  const baseApi = (process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${baseApi}/public/participation/${token}/confirm`;
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

async function buildApplicationMessageTokens(applicationId, client) {
  const [applicationResult, interviewResult] = await Promise.all([
    getApplicationById(applicationId, client),
    getInterviewByApplicationId(applicationId, client),
  ]);

  const application = applicationResult.rows[0] ?? null;
  const interview = interviewResult.rows[0] ?? null;
  const links =
    interview?.confirm_token
      ? buildInterviewLinks(interview.confirm_token)
      : { confirm_url: "", reschedule_url: "" };
  const generatedToken = crypto.randomBytes(24).toString("hex");
  const participationTokenResult = await ensureApplicationParticipationToken(
    applicationId,
    generatedToken,
    client,
  );
  const participationToken =
    participationTokenResult.rows[0]?.participation_token ?? generatedToken;
  const participationConfirmUrl = buildParticipationConfirmLink(participationToken);

  return {
    name: application?.full_name ?? "Applicant",
    application_id: application?.id ?? applicationId,
    program_application_id: interview?.program_application_id ?? "",
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

function buildMessageDraftsFromFlags(input) {
  const drafts = [];
  if (input.send_email) {
    drafts.push({
      channel: "email",
      subject: input.email_subject || null,
      body: input.email_body,
      template_key: input.template_key || null,
    });
  }
  if (input.send_phone) {
    drafts.push({
      channel: "sms",
      subject: null,
      body: input.sms_body,
      template_key: input.template_key || null,
    });
  }
  return drafts;
}

async function queueMessageDrafts(application, actorUserId, drafts, client) {
  if (!Array.isArray(drafts) || !drafts.length) {
    return [];
  }

  const createdDrafts = [];
  for (const draft of drafts) {
    const channel = draft.channel;
    const toValue =
      draft.to_value ??
      (channel === "email" ? application.email : application.phone);

    if (!toValue) {
      continue;
    }

    const row = await createApplicationMessageDraft(
      {
        application_id: application.id,
        channel,
        to_value: String(toValue).trim(),
        subject: draft.subject ?? null,
        body: String(draft.body || "").trim(),
        template_key: draft.template_key ?? null,
        status: "draft",
        created_by: actorUserId,
      },
      client,
    );

    if (row.rowCount) {
      createdDrafts.push(row.rows[0]);
    }
  }

  if (createdDrafts.length) {
    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_MESSAGE_DRAFT_CREATED,
        entityType: "applications",
        entityId: application.id,
        message: `${createdDrafts.length} message draft(s) created for application ${application.id}.`,
        metadata: {
          channels: createdDrafts.map((draft) => draft.channel),
          draft_ids: createdDrafts.map((draft) => draft.id),
        },
        title: "Application Message Drafts Created",
        body: `${createdDrafts.length} draft message(s) prepared for application #${application.id}.`,
      },
      client,
    );
  }

  return createdDrafts;
}

async function sendAccountCredentialsMessageForApplication(
  application,
  applicationId,
  actorUserId,
  generatedPassword,
  client,
) {
  const templateResult = await getMessageTemplateByKey("account_credentials", client);
  const template = templateResult.rows[0] ?? null;
  const signInUrl = buildLearnerSignInUrl();

  const tokens = {
    name: application.full_name || "Student",
    email: application.email || "",
    phone: application.phone || "",
    generated_password: generatedPassword || "",
    sign_in_url: signInUrl,
  };

  const subject = renderTemplateString(
    template?.subject || "Your Digital Hub Account Details",
    tokens,
  );
  const body = renderTemplateString(
    template?.body ||
      "Hello {name},\n\nYour account has been created.\nEmail: {email}\nPassword: {generated_password}\nSign in: {sign_in_url}\n",
    tokens,
  );

  const sentMessages = [];
  const failedMessages = [];

  const emailValue = String(application.email || "").trim();
  const phoneValue = String(application.phone || "").trim();

  const sendEmail = Boolean(emailValue) && !emailValue.endsWith("@digitalhub.local");
  const sendWhatsApp = !sendEmail && Boolean(phoneValue);

  if (!sendEmail && !sendWhatsApp) {
    return { sentMessages, failedMessages, skipped: true };
  }

  if (sendEmail) {
    try {
      await sendDigitalHubEmail({ to: emailValue, subject, body });
      const created = await createApplicationMessageDraft(
        {
          application_id: applicationId,
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
        await markApplicationMessageSent(applicationId, messageId, subject, body, client);
        sentMessages.push({ channel: "email", to: emailValue, message_id: messageId });
      }
    } catch (error) {
      failedMessages.push({ channel: "email", to: emailValue, error: String(error?.message || error) });
      await createApplicationMessageDraft(
        {
          application_id: applicationId,
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

  if (sendWhatsApp) {
    try {
      await sendDigitalHubWhatsApp({ to: phoneValue, body });
      const created = await createApplicationMessageDraft(
        {
          application_id: applicationId,
          channel: "sms",
          to_value: phoneValue,
          subject: null,
          body,
          template_key: "account_credentials",
          status: "sent",
          created_by: actorUserId,
        },
        client,
      );
      const messageId = created.rows[0]?.id;
      if (messageId) {
        await markApplicationMessageSent(applicationId, messageId, null, body, client);
        sentMessages.push({ channel: "sms", to: phoneValue, message_id: messageId });
      }
    } catch (error) {
      failedMessages.push({ channel: "sms", to: phoneValue, error: String(error?.message || error) });
      await createApplicationMessageDraft(
        {
          application_id: applicationId,
          channel: "sms",
          to_value: phoneValue,
          subject: null,
          body,
          template_key: "account_credentials",
          status: "failed",
          created_by: actorUserId,
        },
        client,
      );
    }
  }

  return { sentMessages, failedMessages, skipped: false };
}

async function createUserAndEnrollment(application, actorUserId, reviewMessage, client) {
  if (application.capacity !== null) {
    const capacityResult = await countActiveEnrollmentsByCohort(application.cohort_id, client);
    const enrolledCount = Number(capacityResult.rows[0]?.enrolled_count ?? 0);
    if (enrolledCount >= application.capacity) {
      throw new AppError(409, "COHORT_CAPACITY_EXCEEDED", "Cohort capacity has been reached.");
    }
  }

  let studentUserId;
  let generatedPassword = null;
  const normalizedEmail = normalizeEmail(application.email);
  const normalizedPhone = normalizePhone(application.phone);
  const fallbackEmail = normalizedEmail || (!normalizedPhone ? `application-${application.id}@digitalhub.local` : null);
  const fallbackPhone = normalizedPhone;

  let existingUserResult = null;
  if (fallbackEmail) {
    existingUserResult = await findUserByEmail(fallbackEmail, client);
  }
  if ((!existingUserResult || !existingUserResult.rowCount) && fallbackPhone) {
    existingUserResult = await findUserByPhone(fallbackPhone, client);
  }

  if (existingUserResult.rowCount) {
    studentUserId = Number(existingUserResult.rows[0].id);
    if (!existingUserResult.rows[0].is_student) {
      await setUserAsStudent(studentUserId, client);
    }
  } else {
    generatedPassword = `DH-${crypto.randomBytes(6).toString("hex")}`;
    const passwordHash = await bcrypt.hash(generatedPassword, 10);
    const userInsert = await createStudentUser(fallbackEmail, fallbackPhone, passwordHash, client);
    studentUserId = Number(userInsert.rows[0].id);
  }

  await upsertStudentProfile(studentUserId, application.full_name ?? "Student", client);
  const enrollmentResult = await createEnrollment(studentUserId, application.cohort_id, application.id, client);
  const enrollment = enrollmentResult.rows[0];
  await markApplicationApproved(application.id, actorUserId, reviewMessage, client);

  return {
    studentUserId,
    enrollment,
    generatedPassword,
  };
}

export async function createApplicationService(payload) {
  const body = payload;
  const applicantEmailNorm = normalizeEmail(body.applicant.email);
  const applicantPhoneNorm = normalizePhone(body.applicant.phone);
  const applicantEmail = applicantEmailNorm;
  const applicantPhone = body.applicant.phone?.trim() || null;
  const submissionAnswers = body.answers ?? {};

  return withTransaction(async (client) => {
    const applicantResult = await createApplicant(
      body.applicant.full_name ?? null,
      applicantEmail,
      applicantPhone,
      client,
    );
    const applicant = applicantResult.rows[0];

    let applicationResult;
    try {
      applicationResult = await createApplication(
        body.cohort_id,
        applicant.id,
        applicantEmailNorm,
        applicantPhoneNorm,
        submissionAnswers,
        client,
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(
          409,
          "DUPLICATE_APPLICATION",
          "Form not submitted. You already submitted an application for this cohort with this email or phone.",
        );
      }
      throw error;
    }

    if (!applicationResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    const application = applicationResult.rows[0];
    let resolvedFormId = body.form_id ?? null;

    if (!resolvedFormId) {
      const resolution = await findCohortFormResolution(body.cohort_id, GENERAL_COHORT_FORM_KEY, client);
      if (!resolution.rowCount) {
        throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
      }
      resolvedFormId = resolution.rows[0].application_form_id ?? resolution.rows[0].general_form_id ?? null;

      if (!resolvedFormId) {
        const legacyResolution = await findCohortFormResolution(body.cohort_id, LEGACY_COHORT_FORM_KEY, client);
        if (legacyResolution.rowCount) {
          resolvedFormId =
            legacyResolution.rows[0].application_form_id ?? legacyResolution.rows[0].general_form_id ?? null;
        }
      }
    }

    if (!resolvedFormId) {
      throw new AppError(
        404,
        "FORM_NOT_FOUND",
        "Application form is not configured for this cohort and general cohort form is missing.",
      );
    }

    await createApplicationSubmission(application.id, resolvedFormId, submissionAnswers, client);
    return {
      ...application,
      form_id: resolvedFormId,
    };
  });
}

export async function listApplicationsService(query) {
  const list = parseListQuery(
    query,
    ["id", "status", "stage", "submitted_at", "reviewed_at", "created_at"],
    "submitted_at",
  );
  const sortBy = list.sortBy === "created_at" ? "submitted_at" : list.sortBy;
  const stage = normalizeStage(query.stage);
  const params = [];
  const where = [];

  if (list.search) {
    params.push(`%${list.search}%`);
    where.push(buildSearchClause(["COALESCE(ap.full_name, '')", "COALESCE(ap.email, '')", "c.name"], params.length));
  }

  if (list.status) {
    params.push(list.status);
    where.push(`a.status = $${params.length}`);
  }

  if (stage) {
    params.push(stage);
    where.push(`a.stage = $${params.length}`);
  }

  if (list.cohortId) {
    params.push(list.cohortId);
    where.push(`a.cohort_id = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await countApplications(whereClause, params);
  const total = Number(countResult.rows[0]?.total ?? 0);
  const dataResult = await listApplications(whereClause, sortBy, list.order, params, list.limit, list.offset);

  return {
    data: dataResult.rows,
    pagination: buildPagination(list.page, list.limit, total),
  };
}

export async function getApplicationPipelineService(applicationId) {
  const [applicationResult, interviewResult, messagesResult] = await Promise.all([
    getApplicationById(applicationId),
    getInterviewByApplicationId(applicationId),
    listApplicationMessageDrafts(applicationId),
  ]);

  if (!applicationResult.rowCount) {
    throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
  }

  return {
    application: applicationResult.rows[0],
    interview: interviewResult.rowCount ? interviewResult.rows[0] : null,
    messages: messagesResult.rows,
  };
}

export async function approveApplicationService(applicationId, reviewerId, options) {
  const input = normalizeReviewOptions(options);
  const reviewMessage = input.message;

  return withTransaction(async (client) => {
    const applicationResult = await getApplicationForApproval(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    if (!["applied", "reviewing", "invited_to_interview", "interview_confirmed"].includes(application.status)) {
      throw new AppError(
        409,
        "APPLICATION_ALREADY_REVIEWED",
        "Only active applications can be approved.",
      );
    }

    if (input.send_phone && !application.phone) {
      throw new AppError(400, "VALIDATION_ERROR", "Applicant phone is required when sending phone messages.");
    }

    const enrollmentMeta = await createUserAndEnrollment(
      { ...application, id: applicationId },
      reviewerId,
      reviewMessage,
      client,
    );

    await logAdminAction(
      {
        actorUserId: reviewerId,
        action: "approve application",
        entityType: "applications",
        entityId: applicationId,
        message: `Application ${applicationId} was approved.`,
        metadata: {
          cohort_id: application.cohort_id,
          student_user_id: enrollmentMeta.studentUserId,
          review_message: reviewMessage,
        },
        title: "Application Approved",
        body: `Application #${applicationId} was approved.`,
      },
      client,
    );

    await logAdminAction(
      {
        actorUserId: reviewerId,
        action: "create enrollment",
        entityType: "enrollments",
        entityId: enrollmentMeta.enrollment.id,
        message: `Enrollment ${enrollmentMeta.enrollment.id} was created from application ${applicationId}.`,
        metadata: {
          cohort_id: application.cohort_id,
          student_user_id: enrollmentMeta.studentUserId,
        },
        title: "Enrollment Created",
        body: `Enrollment #${enrollmentMeta.enrollment.id} was created.`,
      },
      client,
    );

    if (input.send_email || input.send_phone) {
      await logAdminAction(
        {
          actorUserId: reviewerId,
          action: "send application decision message",
          entityType: "applications",
          entityId: applicationId,
          message: `Decision message queued for application ${applicationId}.`,
          metadata: {
            decision: "accepted",
            send_email: input.send_email,
            send_phone: input.send_phone,
            recipient_email: application.email ?? null,
            recipient_phone: application.phone ?? null,
            review_message: reviewMessage,
          },
          title: "Application Message Queued",
          body: `Decision message was queued for application #${applicationId}.`,
        },
        client,
      );
    }

    return {
      application_id: applicationId,
      status: "participation_confirmed",
      stage: "participation_confirmed",
      student_user_id: enrollmentMeta.studentUserId,
      enrollment_id: enrollmentMeta.enrollment.id,
      generated_password: enrollmentMeta.generatedPassword,
      review_message: reviewMessage,
      send_email: input.send_email,
      send_phone: input.send_phone,
    };
  });
}

export async function rejectApplicationService(applicationId, reviewerId, options) {
  const input = normalizeReviewOptions(options);
  const reviewMessage = normalizeReviewMessage(input.message ?? input.reason);

  return withTransaction(async (client) => {
    const applicationResult = await getApplicationForApproval(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    if (!["applied", "reviewing", "invited_to_interview", "interview_confirmed", "accepted"].includes(application.status)) {
      throw new AppError(
        409,
        "APPLICATION_ALREADY_REVIEWED",
        "Only active applications can be rejected.",
      );
    }

    if (input.send_email && !application.email) {
      throw new AppError(400, "VALIDATION_ERROR", "Applicant email is required when sending email messages.");
    }

    if (input.send_phone && !application.phone) {
      throw new AppError(400, "VALIDATION_ERROR", "Applicant phone is required when sending phone messages.");
    }

    const result = await rejectPendingApplication(applicationId, reviewerId, reviewMessage, client);
    if (!result.rowCount) {
      throw new AppError(409, "APPLICATION_ALREADY_REVIEWED", "Pending application not found.");
    }

    await logAdminAction(
      {
        actorUserId: reviewerId,
        action: "reject application",
        entityType: "applications",
        entityId: applicationId,
        message: `Application ${applicationId} was rejected.`,
        metadata: { reason: input.reason ?? null, review_message: reviewMessage },
        title: "Application Rejected",
        body: `Application #${applicationId} was rejected.`,
      },
      client,
    );

    if (input.send_email || input.send_phone) {
      await logAdminAction(
        {
          actorUserId: reviewerId,
          action: "send application decision message",
          entityType: "applications",
          entityId: applicationId,
          message: `Decision message queued for application ${applicationId}.`,
          metadata: {
            decision: "rejected",
            send_email: input.send_email,
            send_phone: input.send_phone,
            recipient_email: application.email ?? null,
            recipient_phone: application.phone ?? null,
            review_message: reviewMessage,
          },
          title: "Application Message Queued",
          body: `Decision message was queued for application #${applicationId}.`,
        },
        client,
      );
    }

    return {
      ...result.rows[0],
      stage: "rejected",
      send_email: input.send_email,
      send_phone: input.send_phone,
    };
  });
}

export async function patchApplicationStageService(applicationId, actorUserId, payload) {
  return withTransaction(async (client) => {
    const normalizedInput = normalizeStage(payload.status ?? payload.stage);
    if (!normalizedInput) {
      throw new AppError(400, "VALIDATION_ERROR", "Stage or status is required.");
    }
    const requestedStatus = mapStageToStatus(normalizedInput);

    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    const stage = normalizeStageForFamily(requestedStatus, application.stage);
    let updated;
    const reviewMessage = normalizeReviewMessage(payload.message);

    try {
      updated = await updateApplicationStageAndStatus(
        applicationId,
        stage,
        requestedStatus,
        actorUserId,
        reviewMessage,
        client,
      );
    } catch (error) {
      // Backward compatibility for databases that don't support stage writes.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "42703" || error.code === "23514")
      ) {
        updated = await updateApplicationStatusOnly(
          applicationId,
          requestedStatus,
          actorUserId,
          reviewMessage,
          client,
        );
      } else {
        throw error;
      }
    }

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_STAGE_CHANGED,
        entityType: "applications",
        entityId: applicationId,
        message: `Application ${applicationId} stage changed from ${application.stage} to ${stage}.`,
        metadata: {
          from_stage: application.stage,
          requested_stage: requestedStatus,
          to_stage: stage,
          status: requestedStatus,
        },
        title: "Application Stage Updated",
        body: `Application #${applicationId} moved to stage '${stage}'.`,
      },
      client,
    );

    return updated.rows[0];
  });
}

export async function shortlistApplicationService(applicationId, actorUserId) {
  return withTransaction(async (client) => {
    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    if (!["applied", "reviewing", "submitted", "reviewed", "shortlisted"].includes(application.stage)) {
      throw new AppError(409, "INVALID_STAGE", "Application cannot be shortlisted from current stage.");
    }

    const updated = await updateApplicationStageAndStatus(
      applicationId,
      "reviewing",
      "reviewing",
      actorUserId,
      null,
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_STAGE_CHANGED,
        entityType: "applications",
        entityId: applicationId,
        message: `Application ${applicationId} moved to reviewing.`,
        metadata: { from_stage: application.stage, to_stage: "reviewing" },
        title: "Application Shortlisted",
        body: `Application #${applicationId} was moved to reviewing.`,
      },
      client,
    );

    return updated.rows[0];
  });
}

export async function scheduleApplicationInterviewService(applicationId, actorUserId, payload) {
  return withTransaction(async (client) => {
    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    const confirmToken = crypto.randomBytes(24).toString("hex");
    const links = buildInterviewLinks(confirmToken);

    const interviewResult = await upsertInterviewByApplicationId(
      {
        application_id: applicationId,
        scheduled_at: payload.scheduled_at,
        duration_minutes: payload.duration_minutes ?? 30,
        location_type: payload.location_type ?? "online",
        location_details: payload.location_details ?? null,
        confirm_token: confirmToken,
        created_by: actorUserId,
      },
      client,
    );
    const interview = interviewResult.rows[0];

    const updated = await updateApplicationStageAndStatus(
      applicationId,
      "invited_to_interview",
      "invited_to_interview",
      actorUserId,
      null,
      client,
    );

    const scheduledLabel = new Date(payload.scheduled_at).toUTCString();
    const defaultEmailBody =
      `Dear ${application.full_name || "Applicant"},\n\n` +
      `Your interview has been scheduled on ${scheduledLabel}.\n` +
      `Duration: ${interview.duration_minutes} minutes\n` +
      `Location Type: ${interview.location_type}\n` +
      `Location Details: ${interview.location_details || "-"}\n` +
      `Application ID: ${applicationId}\n` +
      `Confirm Token: ${confirmToken}\n` +
      `Confirm here: ${links.confirm_url}\n` +
      `Reschedule here: ${links.reschedule_url}\n\n` +
      "Best regards,\nAdmissions Team";
    const defaultSmsBody =
      `Interview: ${scheduledLabel} | ${interview.location_type} | ${interview.location_details || "-"} | ` +
      `App#${applicationId} | Token:${confirmToken} | Confirm: ${links.confirm_url} | Reschedule: ${links.reschedule_url}`;

    const drafts = buildMessageDraftsFromFlags({
      send_email: Boolean(payload.send_email),
      send_phone: Boolean(payload.send_phone),
      email_subject: payload.email_subject || "Interview Invitation",
      email_body: payload.email_body || defaultEmailBody,
      sms_body: payload.sms_body || defaultSmsBody,
      template_key: "interview_scheduling",
    });

    const queuedDrafts = await queueMessageDrafts(
      { ...application, id: applicationId },
      actorUserId,
      drafts,
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.INTERVIEW_SCHEDULED,
        entityType: "interviews",
        entityId: interview.id,
        message: `Interview scheduled for application ${applicationId}.`,
        metadata: {
          scheduled_at: interview.scheduled_at,
          location_type: interview.location_type,
          location_details: interview.location_details,
          duration_minutes: interview.duration_minutes,
          message_draft_count: queuedDrafts.length,
        },
        title: "Interview Scheduled",
        body: `Interview scheduled for application #${applicationId}.`,
      },
      client,
    );

    return {
      application: updated.rows[0],
      interview,
      message_drafts: queuedDrafts,
      links,
    };
  });
}

export async function markApplicationInterviewCompletedService(applicationId, actorUserId) {
  return withTransaction(async (client) => {
    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const interviewResult = await markInterviewCompletedByApplicationId(applicationId, client);
    if (!interviewResult.rowCount) {
      throw new AppError(404, "INTERVIEW_NOT_FOUND", "Interview not found for this application.");
    }

    const updated = await updateApplicationStageAndStatus(
      applicationId,
      "interview_confirmed",
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
        message: `Interview marked completed for application ${applicationId}.`,
        metadata: { application_id: applicationId },
        title: "Interview Completed",
        body: `Interview marked completed for application #${applicationId}.`,
      },
      client,
    );

    return {
      application: updated.rows[0],
      interview: interviewResult.rows[0],
    };
  });
}

export async function setApplicationDecisionService(applicationId, actorUserId, payload) {
  return withTransaction(async (client) => {
    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    const decision = payload.decision;
    const nextStage = decision === "accepted" ? "accepted" : "rejected";
    const nextStatus = decision === "accepted" ? "accepted" : "rejected";
    const reviewMessage = normalizeReviewMessage(payload.message);

    const updated = await updateApplicationStageAndStatus(
      applicationId,
      nextStage,
      nextStatus,
      actorUserId,
      reviewMessage,
      client,
    );

    const defaultEmailSubject = decision === "accepted" ? "Application Update: Accepted" : "Application Update: Rejected";
    const defaultEmailBody =
      decision === "accepted"
        ? "Your application has been accepted. If you are sure you want to join, please confirm here: {participation_confirm_url}"
        : "Thank you for applying. Your application was not selected at this time.";
    const defaultSmsBody =
      decision === "accepted"
        ? "Your application is accepted. Confirm participation: {participation_confirm_url}"
        : "Your application was not selected at this time.";

    const autoDrafts = buildMessageDraftsFromFlags({
      send_email: Boolean(payload.send_email),
      send_phone: Boolean(payload.send_phone),
      email_subject: payload.email_subject || defaultEmailSubject,
      email_body: payload.email_body || defaultEmailBody,
      sms_body: payload.sms_body || defaultSmsBody,
      template_key: decision === "accepted" ? "decision_accepted" : "decision_rejected",
    });

    const explicitDrafts = Array.isArray(payload.message_drafts)
      ? payload.message_drafts.map((draft) => ({
          channel: draft.channel,
          to_value: draft.to_value,
          subject: draft.subject ?? null,
          body: draft.body,
          template_key: draft.template_key ?? null,
        }))
      : [];

    const drafts = [...explicitDrafts, ...autoDrafts];
    const queuedDrafts = await queueMessageDrafts(
      { ...application, id: applicationId },
      actorUserId,
      drafts,
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_DECISION_SET,
        entityType: "applications",
        entityId: applicationId,
        message: `Decision '${decision}' recorded for application ${applicationId}.`,
        metadata: {
          decision,
          from_stage: application.stage,
          to_stage: nextStage,
          status: nextStatus,
          message_draft_count: queuedDrafts.length,
        },
        title: "Application Decision Recorded",
        body: `Decision '${decision}' was recorded for application #${applicationId}.`,
      },
      client,
    );

    return {
      application: updated.rows[0],
      message_drafts: queuedDrafts,
    };
  });
}

export async function confirmApplicationParticipationService(applicationId, actorUserId) {
  return withTransaction(async (client) => {
    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    if (application.stage !== "accepted" && application.stage !== "participation_confirmed") {
      throw new AppError(409, "INVALID_STAGE", "Participation can only be confirmed after acceptance.");
    }

    const updated = await updateApplicationStageAndStatus(
      applicationId,
      "participation_confirmed",
      "participation_confirmed",
      actorUserId,
      null,
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.PARTICIPATION_CONFIRMED,
        entityType: "applications",
        entityId: applicationId,
        message: `Participation confirmed for application ${applicationId}.`,
        metadata: { from_stage: application.stage, to_stage: "participation_confirmed" },
        title: "Participation Confirmed",
        body: `Participation confirmed for application #${applicationId}.`,
      },
      client,
    );

    return updated.rows[0];
  });
}

export async function createUserFromApplicationService(applicationId, actorUserId) {
  return withTransaction(async (client) => {
    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    if (application.created_user_id) {
      return {
        application_id: applicationId,
        stage: application.stage,
        status: application.stage,
        student_user_id: application.created_user_id,
        enrollment_id: null,
        generated_password: null,
        onboarding_message: {
          skipped: true,
          reason: "user_already_created",
        },
      };
    }

    if (application.stage !== "participation_confirmed" && application.stage !== "accepted") {
      throw new AppError(
        409,
        "INVALID_STAGE",
        "User can only be created after acceptance.",
      );
    }

    const enrollmentMeta = await createUserAndEnrollment(
      { ...application, id: applicationId },
      actorUserId,
      application.review_message ?? null,
      client,
    );
    await setApplicationCreatedUser(applicationId, enrollmentMeta.studentUserId, client);

    const onboardingMessage = await sendAccountCredentialsMessageForApplication(
      { ...application, id: applicationId },
      applicationId,
      actorUserId,
      enrollmentMeta.generatedPassword,
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.USER_CREATED_FROM_APPLICATION,
        entityType: "applications",
        entityId: applicationId,
        message: `User and enrollment created from application ${applicationId}.`,
        metadata: {
          student_user_id: enrollmentMeta.studentUserId,
          enrollment_id: enrollmentMeta.enrollment.id,
          onboarding_message: onboardingMessage,
        },
        title: "User Created From Application",
        body: `User and enrollment were created from application #${applicationId}.`,
      },
      client,
    );

    return {
      application_id: applicationId,
      stage: "participation_confirmed",
      status: "participation_confirmed",
      student_user_id: enrollmentMeta.studentUserId,
      enrollment_id: enrollmentMeta.enrollment.id,
      generated_password: enrollmentMeta.generatedPassword,
      onboarding_message: onboardingMessage,
    };
  });
}

export async function listApplicationMessagesService(applicationId) {
  const [applicationResult, messagesResult] = await Promise.all([
    getApplicationById(applicationId),
    listApplicationMessageDrafts(applicationId),
  ]);

  if (!applicationResult.rowCount) {
    throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
  }

  return {
    application_id: applicationId,
    messages: messagesResult.rows,
  };
}

export async function createApplicationMessageDraftService(applicationId, actorUserId, payload) {
  return withTransaction(async (client) => {
    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    const toValue =
      payload.to_value ||
      (payload.channel === "email" ? application.email : application.phone);

    if (!toValue) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        `No destination found for ${payload.channel} draft. Provide to_value.`,
      );
    }

    const created = await createApplicationMessageDraft(
      {
        application_id: applicationId,
        channel: payload.channel,
        to_value: toValue,
        subject: payload.subject ?? null,
        body: payload.body,
        template_key: payload.template_key ?? null,
        status: "draft",
        created_by: actorUserId,
      },
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_MESSAGE_DRAFT_CREATED,
        entityType: "applications",
        entityId: applicationId,
        message: `Message draft created for application ${applicationId}.`,
        metadata: {
          message_id: created.rows[0]?.id ?? null,
          channel: payload.channel,
        },
        title: "Application Message Draft Created",
        body: `A ${payload.channel} draft was created for application #${applicationId}.`,
      },
      client,
    );

    return created.rows[0];
  });
}

export async function sendApplicationMessageService(applicationId, messageId, actorUserId) {
  return withTransaction(async (client) => {
    const draftResult = await getApplicationMessageForSend(applicationId, messageId, client);
    if (!draftResult.rowCount) {
      throw new AppError(404, "MESSAGE_NOT_FOUND", "Message draft not found for this application.");
    }

    const draft = draftResult.rows[0];
    const tokens = await buildApplicationMessageTokens(applicationId, client);
    const renderedSubject = renderTemplateString(draft.subject || "Digital Hub Message", tokens);
    const renderedBody = renderTemplateString(draft.body, tokens);
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

    const messageResult = await markApplicationMessageSent(
      applicationId,
      messageId,
      renderedSubject,
      renderedBody,
      client,
    );
    const message = {
      ...(messageResult.rows[0] ?? draft),
      subject: renderedSubject,
      body: renderedBody,
    };
    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_MESSAGE_SENT,
        entityType: "application_messages",
        entityId: message.id,
        message: `Message ${message.id} marked as sent for application ${applicationId}.`,
        metadata: {
          application_id: applicationId,
          channel: message.channel,
        },
        title: "Application Message Sent",
        body: `A ${message.channel} message for application #${applicationId} was marked as sent.`,
      },
      client,
    );

    return message;
  });
}

export async function publicConfirmInterviewService(token, payload) {
  return withTransaction(async (client) => {
    const interviewResult = await findInterviewByTokenForUpdate(token, client);
    if (!interviewResult.rowCount) {
      throw new AppError(404, "NOT_FOUND", "Interview token is invalid.");
    }

    const interview = interviewResult.rows[0];
    const updatedResult = await confirmInterviewByToken(token, payload.note ?? null, client);
    const updated = updatedResult.rows[0];

    if (interview.program_application_id) {
      await updateProgramApplicationStageIfMatch(
        interview.program_application_id,
        "invited_to_interview",
        "interview_confirmed",
        client,
      );
    }

    const entityLabel = interview.program_application_id
      ? `program application ${interview.program_application_id}`
      : `application ${interview.application_id}`;

    await logAdminAction(
      {
        actorUserId: null,
        action: ADMIN_ACTIONS.INTERVIEW_CONFIRMED_BY_APPLICANT,
        entityType: "interviews",
        entityId: interview.id,
        message: `Applicant confirmed interview for ${entityLabel}.`,
        metadata: {
          application_id: interview.application_id,
          program_application_id: interview.program_application_id,
          note: payload.note ?? null,
        },
        title: "Interview Confirmed By Applicant",
        body: `Applicant confirmed interview for ${entityLabel}.`,
      },
      client,
    );

    return updated;
  });
}

export async function publicRescheduleInterviewService(token, payload) {
  return withTransaction(async (client) => {
    const interviewResult = await findInterviewByTokenForUpdate(token, client);
    if (!interviewResult.rowCount) {
      throw new AppError(404, "NOT_FOUND", "Interview token is invalid.");
    }

    const interview = interviewResult.rows[0];
    const updatedResult = await requestInterviewRescheduleByToken(
      token,
      payload.requested_at,
      payload.note ?? null,
      client,
    );
    const updated = updatedResult.rows[0];

    const entityLabel = interview.program_application_id
      ? `program application ${interview.program_application_id}`
      : `application ${interview.application_id}`;

    await logAdminAction(
      {
        actorUserId: null,
        action: ADMIN_ACTIONS.INTERVIEW_RESCHEDULE_REQUESTED,
        entityType: "interviews",
        entityId: interview.id,
        message: `Applicant requested interview reschedule for ${entityLabel}.`,
        metadata: {
          application_id: interview.application_id,
          program_application_id: interview.program_application_id,
          requested_at: payload.requested_at,
          note: payload.note ?? null,
        },
        title: "Interview Reschedule Requested",
        body: `Applicant requested reschedule for ${entityLabel}.`,
      },
      client,
    );

    return updated;
  });
}

export async function publicConfirmParticipationService(token, payload) {
  return withTransaction(async (client) => {
    const applicationResult = await findApplicationByParticipationTokenForUpdate(token, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "NOT_FOUND", "Participation token is invalid.");
    }

    const application = applicationResult.rows[0];
    if (application.stage !== "accepted" && application.stage !== "participation_confirmed") {
      const linkedProgramResult = await hasAcceptedProgramApplicationLinkedToApplication(
        Number(application.id),
        client,
      );
      if (!linkedProgramResult.rowCount) {
        throw new AppError(409, "INVALID_STAGE", "Participation can only be confirmed after acceptance.");
      }
    }

    const updated = await updateApplicationStageAndStatus(
      Number(application.id),
      "participation_confirmed",
      "participation_confirmed",
      null,
      null,
      client,
    );

    const linkedProgramUpdates = await markProgramApplicationParticipationConfirmedByLinkedApplicationId(
      Number(application.id),
      payload?.note ?? null,
      client,
    );

    await logAdminAction(
      {
        actorUserId: null,
        action: ADMIN_ACTIONS.PARTICIPATION_CONFIRMED,
        entityType: "applications",
        entityId: Number(application.id),
        message: `Applicant confirmed participation for application ${application.id}.`,
        metadata: {
          application_id: Number(application.id),
          note: payload?.note ?? null,
          linked_program_application_count: linkedProgramUpdates.rowCount,
        },
        title: "Participation Confirmed By Applicant",
        body: `Applicant confirmed participation for application #${application.id}.`,
      },
      client,
    );

    return {
      application: updated.rows[0],
      linked_program_applications_updated: linkedProgramUpdates.rowCount,
    };
  });
}

function isUniqueViolation(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
