// File: server/src/services/applications.service.ts
// Purpose: Implements the business rules for applications.
// It coordinates validation, data access, and side effects before results go back to controllers.



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
  markApplicationMessageFailed,
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
import type { DbClient } from "../db/index.js";

type AnyRecord = Record<string, any>;
type QueryParams = Record<string, any>;
type DeliveryChannels = {
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
};

const GENERAL_COHORT_FORM_KEY = "cohort_application";
const LEGACY_COHORT_FORM_KEY = "general_application_form";

const APPLICATION_STAGES = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "interview_completed",
  "accepted",
  "rejected",
  "participation_confirmed",
  // Backward-compatibility aliases kept for older records/environments.
  "submitted",
  "reviewed",
  "shortlisted",
  "interview_scheduled",
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
  "interview_completed",
];

const MODERN_TO_LEGACY_STAGE: Record<string, string> = {
  applied: "submitted",
  reviewing: "reviewed",
  invited_to_interview: "interview_scheduled",
  interview_confirmed: "interview_completed",
  interview_completed: "interview_completed",
};

const LEGACY_TO_MODERN_STAGE: Record<string, string> = {
  submitted: "applied",
  reviewed: "reviewing",
  shortlisted: "reviewing",
  interview_scheduled: "invited_to_interview",
  interview_completed: "interview_completed",
  user_created: "participation_confirmed",
};

const APPLICATION_STATUSES = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "interview_completed",
  "accepted",
  "rejected",
  "participation_confirmed",
];

const STAGE_ORDER = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "interview_completed",
  "accepted",
  "participation_confirmed",
];

// Handles 'normalizeReviewMessage' workflow for this module.
function normalizeReviewMessage(message: unknown) {
  if (typeof message !== "string") {
    return null;
  }

  const trimmed = message.trim();
  return trimmed ? trimmed : null;
}

// Handles 'normalizeReviewOptions' workflow for this module.
function normalizeReviewOptions(input: unknown) {
  if (typeof input === "string") {
    return {
      reason: null,
      message: normalizeReviewMessage(input),
      send_email: false,
      send_phone: false,
    };
  }

  const value: AnyRecord = typeof input === "object" && input !== null ? input as AnyRecord : {};
  return {
    reason: typeof value.reason === "string" ? value.reason.trim() || null : null,
    message: normalizeReviewMessage(value.message),
    send_email: Boolean(value.send_email),
    send_phone: Boolean(value.send_phone),
  };
}

// Handles 'normalizeStage' workflow for this module.
function normalizeStage(value: unknown) {
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

// Handles 'mapStageToStatus' workflow for this module.
function mapStageToStatus(stage: string) {
  const normalizedStage = LEGACY_TO_MODERN_STAGE[stage] || stage;
  if (APPLICATION_STATUSES.includes(normalizedStage)) {
    return normalizedStage;
  }
  return "applied";
}

// Handles 'mapLegacyStatusToStage' workflow for this module.
function mapLegacyStatusToStage(status: unknown) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "pending") return "applied";
  if (value === "waitlisted") return "reviewing";
  if (value === "approved") return "accepted";
  if (value === "rejected") return "rejected";
  if (APPLICATION_STATUSES.includes(value)) return value;
  return undefined;
}

// Handles 'mapStageToLegacyStatus' workflow for this module.
function mapStageToLegacyStatus(stage: string) {
  const normalizedStage = LEGACY_TO_MODERN_STAGE[stage] || stage;
  if (normalizedStage === "rejected") return "rejected";
  if (normalizedStage === "accepted" || normalizedStage === "participation_confirmed") return "approved";
  if (
    normalizedStage === "reviewing" ||
    normalizedStage === "invited_to_interview" ||
    normalizedStage === "interview_confirmed" ||
    normalizedStage === "interview_completed"
  ) {
    return "waitlisted";
  }
  return "pending";
}

// Handles 'normalizeStageForFamily' workflow for this module.
function normalizeStageForFamily(stage: unknown, currentStage: unknown) {
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

// Handles 'buildInterviewLinks' workflow for this module.
function buildInterviewLinks(token: string) {
  const base = (
    process.env.PUBLIC_SITE_URL ||
    process.env.PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
  const hasSiteUrl = Boolean(process.env.PUBLIC_SITE_URL);
  return {
    confirm_url: hasSiteUrl
      ? `${base}/interview/confirm?token=${token}`
      : `${base}/public/interviews/${token}/confirm`,
    reschedule_url: hasSiteUrl
      ? `${base}/interview/reschedule?token=${token}`
      : `${base}/public/interviews/${token}/reschedule`,
  };
}

// Handles 'buildLearnerSignInUrl' workflow for this module.
function buildLearnerSignInUrl() {
  const url =
    process.env.LEARNER_SIGNIN_URL ||
    process.env.STUDENT_SIGNIN_URL ||
    process.env.PUBLIC_STUDENT_SIGNIN_URL ||
    "";

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(
        500,
        "CONFIGURATION_ERROR",
        "LEARNER_SIGNIN_URL is not configured. Cannot send credential emails in production.",
      );
    }
    console.warn(
      "[applications] LEARNER_SIGNIN_URL is not set. Credential emails will not include a valid sign-in link.",
    );
    return "(Sign-in link not configured — contact admissions)";
  }

  return url;
}

// Handles 'buildParticipationConfirmLink' workflow for this module.
function buildParticipationConfirmLink(token: string) {
  const base = (
    process.env.PUBLIC_SITE_URL ||
    process.env.PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
  const hasSiteUrl = Boolean(process.env.PUBLIC_SITE_URL);

  return hasSiteUrl
    ? `${base}/confirm-participation?token=${token}`
    : `${base}/public/participation/${token}/confirm`;
}

async function sendAdmissionsAdminNotification(subject: string, body: string) {
  const adminNotifyEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.DIGITAL_HUB_EMAIL || null;
  if (!adminNotifyEmail) return;

  try {
    await sendDigitalHubEmail({
      to: adminNotifyEmail,
      subject,
      body,
    });
  } catch {
    // Non-blocking.
  }
}

// Handles 'formatTemplateDate' workflow for this module.
function formatTemplateDate(value: unknown) {
  if (!value) return "";
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toUTCString();
}

// Handles 'renderTemplateString' workflow for this module.
function renderTemplateString(input: unknown, tokens: Record<string, unknown>) {
  return String(input ?? "").replace(/\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, rawKey) => {
    const key = String(rawKey || "").trim();
    if (!(key in tokens)) return match;
    const value = tokens[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

// Handles 'buildApplicationMessageTokens' workflow for this module.
async function buildApplicationMessageTokens(applicationId: number, client: DbClient) {
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

// Handles 'buildMessageDraftsFromFlags' workflow for this module.
function buildMessageDraftsFromFlags(input: AnyRecord) {
  const drafts: AnyRecord[] = [];
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

// Handles 'queueMessageDrafts' workflow for this module.
async function queueMessageDrafts(
  application: AnyRecord,
  actorUserId: number,
  drafts: AnyRecord[],
  client: DbClient,
) {
  if (!Array.isArray(drafts) || !drafts.length) {
    return { sentMessages: [], failedMessages: [], skippedCount: 0 };
  }

  const tokens = await buildApplicationMessageTokens(application.id, client);
  const sentMessages: AnyRecord[] = [];
  const failedMessages: AnyRecord[] = [];
  let skippedCount = 0;

  for (const draft of drafts) {
    const channel = draft.channel === "sms" ? "sms" : "email";
    const toValue =
      draft.to_value ??
      (channel === "email" ? application.email : application.phone);

    if (!toValue) {
      skippedCount += 1;
      continue;
    }

    const trimmedBody = String(draft.body || "").trim();
    if (!trimmedBody) {
      skippedCount += 1;
      continue;
    }

    const renderedSubject =
      channel === "email"
        ? renderTemplateString(draft.subject || "Digital Hub Message", tokens)
        : null;
    const renderedBody = renderTemplateString(trimmedBody, tokens);

    const row = await createApplicationMessageDraft(
      {
        application_id: application.id,
        channel,
        to_value: String(toValue).trim(),
        subject: draft.subject ?? null,
        body: trimmedBody,
        template_key: draft.template_key ?? null,
        status: "draft",
        created_by: actorUserId,
      },
      client,
    );

    if (!row.rowCount || !row.rows[0]?.id) {
      failedMessages.push({
        channel,
        to_value: String(toValue).trim(),
        status: "failed",
        error: "MESSAGE_CREATE_FAILED",
      });
      continue;
    }

    const messageId = Number(row.rows[0].id);
    try {
      if (channel === "email") {
        await sendDigitalHubEmail({
          to: String(toValue).trim(),
          subject: renderedSubject || "Digital Hub Message",
          body: renderedBody,
        });
      } else {
        await sendDigitalHubWhatsApp({
          to: String(toValue).trim(),
          body: renderedBody,
        });
      }

      const sentResult = await markApplicationMessageSent(
        application.id,
        messageId,
        renderedSubject,
        renderedBody,
        client,
      );

      sentMessages.push({
        ...(sentResult.rows[0] ?? row.rows[0]),
        subject: renderedSubject,
        body: renderedBody,
      });
    } catch (error: any) {
      const failedResult = await markApplicationMessageFailed(
        application.id,
        messageId,
        renderedSubject,
        renderedBody,
        client,
      );
      failedMessages.push({
        ...(failedResult.rows[0] ?? row.rows[0]),
        subject: renderedSubject,
        body: renderedBody,
        status: "failed",
        error: String(error?.message || error),
      });
    }
  }

  if (sentMessages.length || failedMessages.length) {
    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_MESSAGE_SENT,
        entityType: "applications",
        entityId: application.id,
        message: `${sentMessages.length} message(s) sent and ${failedMessages.length} failed for application ${application.id}.`,
        metadata: {
          channels: Array.from(
            new Set(
              [...sentMessages, ...failedMessages]
                .map((item) => item.channel)
                .filter(Boolean),
            ),
          ),
          sent_count: sentMessages.length,
          failed_count: failedMessages.length,
          sent_ids: sentMessages.map((item) => item.id).filter(Boolean),
          failed_ids: failedMessages.map((item) => item.id).filter(Boolean),
        },
        title: failedMessages.length
          ? "Application Messages Processed (With Failures)"
          : "Application Messages Sent",
        body: failedMessages.length
          ? `${sentMessages.length} message(s) sent and ${failedMessages.length} failed for application #${application.id}.`
          : `${sentMessages.length} message(s) sent for application #${application.id}.`,
      },
      client,
    );
  }

  return { sentMessages, failedMessages, skippedCount };
}

// Handles 'sendAccountCredentialsMessageForApplication' workflow for this module.
async function sendAccountCredentialsMessageForApplication(
  application: AnyRecord,
  applicationId: number,
  actorUserId: number,
  generatedPassword: string | null,
  client: DbClient,
  deliveryChannels?: DeliveryChannels,
) {
  const templateKey = generatedPassword ? "account_credentials" : "account_existing_reminder";
  const templateResult = await getMessageTemplateByKey(templateKey, client);
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
    template?.subject || (generatedPassword ? "Your Digital Hub Account Details" : "Your Digital Hub Account Access"),
    tokens,
  );
  const body = renderTemplateString(
    template?.body ||
      (generatedPassword
        ? "Hello {name},\n\nYour account has been created.\nEmail: {email}\nPassword: {generated_password}\nSign in: {sign_in_url}\n"
        : "Hello {name},\n\nYour account is active.\nEmail: {email}\nSign in: {sign_in_url}\nIf you forgot your password, use Forgot Password on the sign-in page.\n"),
    tokens,
  );

  const sentMessages: AnyRecord[] = [];
  const failedMessages: AnyRecord[] = [];
  const allowEmail = deliveryChannels?.email !== false;
  const allowSms = deliveryChannels?.sms !== false;

  const emailValue = String(application.email || "").trim();
  const phoneValue = String(application.phone || "").trim();

  if (!allowEmail && !allowSms) {
    return { sentMessages, failedMessages, skipped: true, reason: "channels_disabled" };
  }

  const sendEmail = allowEmail && Boolean(emailValue) && !emailValue.endsWith("@digitalhub.local");
  const sendWhatsApp = allowSms && Boolean(phoneValue);

  if (!sendEmail && !sendWhatsApp) {
    const reason = !emailValue && !phoneValue ? "no_contact_channel" : "no_supported_destination";
    return { sentMessages, failedMessages, skipped: true, reason };
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
          template_key: templateKey,
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
    } catch (error: any) {
      failedMessages.push({ channel: "email", to: emailValue, error: String(error?.message || error) });
      await createApplicationMessageDraft(
        {
          application_id: applicationId,
          channel: "email",
          to_value: emailValue,
          subject,
          body,
          template_key: templateKey,
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
          template_key: templateKey,
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
    } catch (error: any) {
      failedMessages.push({ channel: "sms", to: phoneValue, error: String(error?.message || error) });
      await createApplicationMessageDraft(
        {
          application_id: applicationId,
          channel: "sms",
          to_value: phoneValue,
          subject: null,
          body,
          template_key: templateKey,
          status: "failed",
          created_by: actorUserId,
        },
        client,
      );
    }
  }

  return { sentMessages, failedMessages, skipped: false };
}

// Handles 'createUserAndEnrollment' workflow for this module.
async function createUserAndEnrollment(
  application: AnyRecord,
  actorUserId: number,
  reviewMessage: string | null,
  client: DbClient,
) {
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

  if (existingUserResult?.rowCount) {
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

// Handles 'createApplicationService' workflow for this module.
export async function createApplicationService(payload: AnyRecord) {
  const body = payload;
  const applicantEmailNorm = normalizeEmail(body.applicant.email);
  const applicantPhoneNorm = normalizePhone(body.applicant.phone);
  const applicantEmail = applicantEmailNorm;
  const applicantPhone = body.applicant.phone?.trim() || null;
  const submissionAnswers = body.answers ?? {};

  return withTransaction(async (client: DbClient) => {
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
    } catch (error: any) {
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

// Handles 'listApplicationsService' workflow for this module.
export async function listApplicationsService(query: QueryParams) {
  const list = parseListQuery(
    query,
    ["id", "status", "stage", "submitted_at", "reviewed_at", "created_at"],
    "submitted_at",
  );
  const sortBy = list.sortBy === "created_at" ? "submitted_at" : list.sortBy;
  const stage = normalizeStage(query.stage);
  const params: Array<string | number | boolean | null> = [];
  const where: string[] = [];

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

// Handles 'getApplicationPipelineService' workflow for this module.
export async function getApplicationPipelineService(applicationId: number) {
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

// Handles 'approveApplicationService' workflow for this module.
export async function approveApplicationService(applicationId: number, reviewerId: number, options: AnyRecord) {
  return setApplicationDecisionService(applicationId, reviewerId, {
    decision: "accepted",
    message: options.message ?? null,
    send_email: options.send_email ?? false,
    send_phone: options.send_phone ?? false,
  });
}

// Handles 'rejectApplicationService' workflow for this module.
export async function rejectApplicationService(applicationId: number, reviewerId: number, options: AnyRecord) {
  const input = normalizeReviewOptions(options);
  const reviewMessage = normalizeReviewMessage(input.message ?? input.reason);

  return withTransaction(async (client: DbClient) => {
    const applicationResult = await getApplicationForApproval(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    if (!["applied", "reviewing", "invited_to_interview", "interview_confirmed", "interview_completed", "accepted"].includes(application.status)) {
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

    const defaultEmailSubject = "Application Update";
    const defaultEmailBody = input.message
      ? `Dear ${application.full_name || "Applicant"},\n\n${input.message}\n\nBest regards,\nAdmissions Team`
      : "Thank you for applying. After careful review, we are unable to offer a place at this time.\n\nBest regards,\nAdmissions Team";
    const defaultSmsBody = input.message || "Your application was not selected at this time.";

    const drafts = buildMessageDraftsFromFlags({
      send_email: Boolean(input.send_email),
      send_phone: Boolean(input.send_phone),
      email_subject: defaultEmailSubject,
      email_body: defaultEmailBody,
      sms_body: defaultSmsBody,
      template_key: "decision_rejected",
    });

    const messageDispatch = await queueMessageDrafts(
      { ...application, id: applicationId },
      reviewerId,
      drafts,
      client,
    );

    return {
      ...result.rows[0],
      stage: "rejected",
      send_email: input.send_email,
      send_phone: input.send_phone,
      sent_messages: messageDispatch.sentMessages,
      failed_messages: messageDispatch.failedMessages,
    };
  });
}

// Handles 'patchApplicationStageService' workflow for this module.
export async function patchApplicationStageService(applicationId: number, actorUserId: number, payload: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
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
    const currentNormalized = LEGACY_TO_MODERN_STAGE[application.stage] || application.stage;
    const currentIndex = STAGE_ORDER.indexOf(currentNormalized);
    const targetIndex = STAGE_ORDER.indexOf(requestedStatus);
    const forceTransition = payload.force_transition === true;

    if (
      !forceTransition &&
      currentNormalized !== "rejected" &&
      currentIndex >= 0 &&
      targetIndex >= 0 &&
      targetIndex > currentIndex + 1 &&
      requestedStatus !== "rejected"
    ) {
      throw new AppError(
        409,
        "INVALID_STAGE_TRANSITION",
        `Cannot move from '${currentNormalized}' directly to '${requestedStatus}'. ` +
          `Please follow the pipeline: ${STAGE_ORDER.slice(currentIndex + 1, targetIndex + 1).join(" → ")}.`,
      );
    }

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
    } catch (error: any) {
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

// Handles 'shortlistApplicationService' workflow for this module.
export async function shortlistApplicationService(applicationId: number, actorUserId: number) {
  return withTransaction(async (client: DbClient) => {
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

// Handles 'scheduleApplicationInterviewService' workflow for this module.
export async function scheduleApplicationInterviewService(applicationId: number, actorUserId: number, payload: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
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
      `App#${applicationId} | Confirm: ${links.confirm_url} | Reschedule: ${links.reschedule_url}`;

    const drafts = buildMessageDraftsFromFlags({
      send_email: Boolean(payload.send_email),
      send_phone: Boolean(payload.send_phone),
      email_subject: payload.email_subject || "Interview Invitation",
      email_body: payload.email_body || defaultEmailBody,
      sms_body: payload.sms_body || defaultSmsBody,
      template_key: "interview_scheduling",
    });

    const messageDispatch = await queueMessageDrafts(
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
          message_sent_count: messageDispatch.sentMessages.length,
          message_failed_count: messageDispatch.failedMessages.length,
          message_skipped_count: messageDispatch.skippedCount,
        },
        title: "Interview Scheduled",
        body: `Interview scheduled for application #${applicationId}.`,
      },
      client,
    );

    return {
      application: updated.rows[0],
      interview,
      sent_messages: messageDispatch.sentMessages,
      failed_messages: messageDispatch.failedMessages,
      message_drafts: [...messageDispatch.sentMessages, ...messageDispatch.failedMessages],
      links,
    };
  });
}

// Handles 'markApplicationInterviewCompletedService' workflow for this module.
export async function markApplicationInterviewCompletedService(applicationId: number, actorUserId: number) {
  return withTransaction(async (client: DbClient) => {
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
      "interview_completed",
      "interview_completed",
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

    const applicationRow = applicationResult.rows[0];
    const templateResult = await getMessageTemplateByKey("interview_confirmation", client);
    const template = templateResult.rows[0] ?? null;

    if (template && (applicationRow.email || applicationRow.phone)) {
      const drafts = buildMessageDraftsFromFlags({
        send_email: Boolean(applicationRow.email),
        send_phone: Boolean(applicationRow.phone),
        email_subject: template.subject || "Interview Confirmation",
        email_body:
          template.body ||
          "Dear {name},\n\nThank you for attending your interview. We will be in touch with our decision soon.\n\nBest regards,\nAdmissions Team",
        sms_body: "Thank you for attending your interview. We will contact you with our decision soon.",
        template_key: "interview_confirmation",
      });

      await queueMessageDrafts(
        { ...applicationRow, id: applicationId },
        actorUserId,
        drafts,
        client,
      );
    }

    return {
      application: updated.rows[0],
      interview: interviewResult.rows[0],
    };
  });
}

// Handles 'setApplicationDecisionService' workflow for this module.
export async function setApplicationDecisionService(applicationId: number, actorUserId: number, payload: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
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
    const messageDispatch = await queueMessageDrafts(
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
          message_sent_count: messageDispatch.sentMessages.length,
          message_failed_count: messageDispatch.failedMessages.length,
          message_skipped_count: messageDispatch.skippedCount,
        },
        title: "Application Decision Recorded",
        body: `Decision '${decision}' was recorded for application #${applicationId}.`,
      },
      client,
    );

    return {
      application: updated.rows[0],
      sent_messages: messageDispatch.sentMessages,
      failed_messages: messageDispatch.failedMessages,
      message_drafts: [...messageDispatch.sentMessages, ...messageDispatch.failedMessages],
    };
  });
}

// Handles 'confirmApplicationParticipationService' workflow for this module.
export async function confirmApplicationParticipationService(applicationId: number, actorUserId: number) {
  return withTransaction(async (client: DbClient) => {
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

export async function resendAcceptanceMessageService(applicationId: number, actorUserId: number) {
  return withTransaction(async (client: DbClient) => {
    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    if (!["accepted", "participation_confirmed"].includes(application.stage)) {
      throw new AppError(409, "INVALID_STAGE", "Can only resend acceptance to accepted applications.");
    }

    const drafts = buildMessageDraftsFromFlags({
      send_email: Boolean(application.email),
      send_phone: Boolean(application.phone),
      email_subject: "Application Accepted — Please Confirm",
      email_body: "Your application has been accepted. Please confirm your participation: {participation_confirm_url}",
      sms_body: "Your application is accepted. Confirm: {participation_confirm_url}",
      template_key: "decision_accepted",
    });

    const messageDispatch = await queueMessageDrafts(
      { ...application, id: applicationId },
      actorUserId,
      drafts,
      client,
    );

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.APPLICATION_MESSAGE_SENT,
        entityType: "applications",
        entityId: applicationId,
        message: `Acceptance message resent for application ${applicationId}.`,
        metadata: {
          stage: application.stage,
          sent_count: messageDispatch.sentMessages.length,
          failed_count: messageDispatch.failedMessages.length,
        },
        title: "Acceptance Message Resent",
        body: `Acceptance message resent for application #${applicationId}.`,
      },
      client,
    );

    return {
      sent_messages: messageDispatch.sentMessages,
      failed_messages: messageDispatch.failedMessages,
    };
  });
}

// Handles 'createUserFromApplicationService' workflow for this module.
export async function createUserFromApplicationService(
  applicationId: number,
  actorUserId: number,
  options: { channels?: DeliveryChannels } = {},
) {
  return withTransaction(async (client: DbClient) => {
    const applicationResult = await getApplicationForPipelineUpdate(applicationId, client);
    if (!applicationResult.rowCount) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    }

    const application = applicationResult.rows[0];
    const deliveryChannels = {
      email: options?.channels?.email !== false,
      sms: options?.channels?.sms !== false,
    };
    if (application.created_user_id) {
      const onboardingMessage = await sendAccountCredentialsMessageForApplication(
        { ...application, id: applicationId },
        applicationId,
        actorUserId,
        null,
        client,
        deliveryChannels,
      );

      return {
        application_id: applicationId,
        stage: application.stage,
        status: application.stage,
        student_user_id: application.created_user_id,
        enrollment_id: null,
        generated_password: null,
        existing_user: true,
        onboarding_message: onboardingMessage,
      };
    }

    if (application.stage !== "participation_confirmed" && application.stage !== "accepted") {
      throw new AppError(
        409,
        "INVALID_STAGE",
        "User can only be created when the application is in 'accepted' or 'participation_confirmed' stage.",
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
      deliveryChannels,
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
      existing_user: enrollmentMeta.generatedPassword ? false : true,
      onboarding_message: onboardingMessage,
    };
  });
}

// Handles 'listApplicationMessagesService' workflow for this module.
export async function listApplicationMessagesService(applicationId: number) {
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

// Handles 'createApplicationMessageDraftService' workflow for this module.
export async function createApplicationMessageDraftService(applicationId: number, actorUserId: number, payload: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
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

// Handles 'sendApplicationMessageService' workflow for this module.
export async function sendApplicationMessageService(applicationId: number, messageId: number, actorUserId: number) {
  return withTransaction(async (client: DbClient) => {
    const draftResult = await getApplicationMessageForSend(applicationId, messageId, client);
    if (!draftResult.rowCount) {
      throw new AppError(404, "MESSAGE_NOT_FOUND", "Message draft not found for this application.");
    }

    const draft = draftResult.rows[0];
    if (!["draft", "failed"].includes(String(draft.status || "draft"))) {
      throw new AppError(409, "VALIDATION_ERROR", "Only draft or failed messages can be sent.");
    }
    const tokens = await buildApplicationMessageTokens(applicationId, client);
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
    } catch (error: any) {
      const failedResult = await markApplicationMessageFailed(
        applicationId,
        messageId,
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
          message: `Message ${failedMessage.id} failed to send for application ${applicationId}.`,
          metadata: {
            application_id: applicationId,
            channel: failedMessage.channel,
            status: "failed",
            error: String(error?.message || error),
          },
          title: "Application Message Failed",
          body: `A ${failedMessage.channel} message failed for application #${applicationId}.`,
        },
        client,
      );

      return failedMessage;
    }
  });
}

// Handles 'publicConfirmInterviewService' workflow for this module.
export async function publicConfirmInterviewService(token: string, payload: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
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

    if (interview.application_id) {
      const applicationResult = await getApplicationForPipelineUpdate(interview.application_id, client);
      if (applicationResult.rowCount) {
        const application = applicationResult.rows[0];
        const normalizedStage = LEGACY_TO_MODERN_STAGE[String(application.stage || "")] || String(application.stage || "");
        if (normalizedStage === "invited_to_interview") {
          const nextStage = normalizeStageForFamily("interview_confirmed", application.stage);
          const nextStatus = mapStageToStatus(nextStage);
          await updateApplicationStageAndStatus(
            application.id,
            nextStage,
            nextStatus,
            null,
            null,
            client,
          );
        }
      }
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

// Handles 'publicRescheduleInterviewService' workflow for this module.
export async function publicRescheduleInterviewService(token: string, payload: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
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

    const requestedAtLabel = payload.requested_at
      ? new Date(payload.requested_at).toUTCString()
      : "not specified";
    await sendAdmissionsAdminNotification(
      `Interview Reschedule Request — Application #${interview.application_id || "N/A"}`,
      `An applicant has requested to reschedule their interview.\n\n` +
        `Application ID: ${interview.application_id || "N/A"}\n` +
        `Requested new time: ${requestedAtLabel}\n` +
        `Note: ${payload.note || "None"}\n\n` +
        `Please log in to the dashboard to reschedule the interview.\n`,
    );

    return updated;
  });
}

// Handles 'publicConfirmParticipationService' workflow for this module.
export async function publicConfirmParticipationService(token: string, payload: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
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

    await sendAdmissionsAdminNotification(
      `Participation Confirmed — Application #${application.id}`,
      `${application.full_name || "An applicant"} has confirmed their participation.\n\n` +
        `Application ID: ${application.id}\n` +
        `Email: ${application.email || "N/A"}\n` +
        `Phone: ${application.phone || "N/A"}\n\n` +
        `They are ready for user account creation.\n`,
    );

    return {
      application: updated.rows[0],
      linked_program_applications_updated: linkedProgramUpdates.rowCount,
    };
  });
}

// Handles 'isUniqueViolation' workflow for this module.
function isUniqueViolation(error: any) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

