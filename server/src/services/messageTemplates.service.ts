// File Summary: server/src/services/messageTemplates.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
import { ADMIN_ACTIONS } from "../constants/adminActions.js";
import {
  createMessageTemplate,
  ensureMessageTemplatesTable,
  getMessageTemplateByKey,
  insertDefaultMessageTemplate,
  listMessageTemplates,
  setMessageTemplateActiveByKey,
  updateMessageTemplateByKey,
} from "../repositories/messageTemplates.repo.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildUpdateQuery } from "../utils/sql.js";

const DEFAULT_MESSAGE_TEMPLATES = [
  {
    key: "general_update",
    label: "General Update",
    description: "Generic update for applicants/users.",
    channel: "all",
    subject: "General Update",
    body: "Hello {name},\n\nWe have a quick update for you.\n\nBest regards,\nDigital Hub Team",
    is_active: true,
    sort_order: 10,
  },
  {
    key: "reminder",
    label: "Reminder",
    description: "Reminder message for pending actions.",
    channel: "all",
    subject: "Reminder",
    body: "Hello {name},\n\nThis is a reminder about your pending action.\n\nBest regards,\nDigital Hub Team",
    is_active: true,
    sort_order: 20,
  },
  {
    key: "follow_up",
    label: "Follow Up",
    description: "Follow-up message after a previous contact.",
    channel: "all",
    subject: "Follow Up",
    body: "Hello {name},\n\nFollowing up on our previous message.\n\nBest regards,\nDigital Hub Team",
    is_active: true,
    sort_order: 30,
  },
  {
    key: "interview_scheduling",
    label: "Interview Scheduling",
    description: "Template for interview scheduling messages.",
    channel: "all",
    subject: "Interview Invitation",
    body:
      "Dear {name},\n\nYour interview has been scheduled on {scheduled_at}.\n" +
      "Duration: {duration_minutes} minutes\n" +
      "Location Type: {location_type}\n" +
      "Location Details: {location_details}\n" +
      "Application ID: {application_id}\n" +
      "Confirm Token: {confirm_token}\n" +
      "Confirm here: {confirm_url}\n" +
      "Reschedule here: {reschedule_url}\n\nBest regards,\nAdmissions Team",
    is_active: true,
    sort_order: 40,
  },
  {
    key: "interview_confirmation",
    label: "Interview Confirmation",
    description: "Template when interview is confirmed.",
    channel: "all",
    subject: "Interview Confirmed",
    body:
      "Dear {name},\n\nYour interview is confirmed for {scheduled_at}.\n" +
      "We look forward to speaking with you.\n\nBest regards,\nAdmissions Team",
    is_active: true,
    sort_order: 50,
  },
  {
    key: "decision_accepted",
    label: "Acceptance Letter",
    description: "Template for accepted decisions.",
    channel: "all",
    subject: "Application Accepted",
    body:
      "Dear {name},\n\nCongratulations. You have been accepted into our program.\n" +
      "If you are sure you want to join, please confirm here:\n{participation_confirm_url}\n\n" +
      "Warm regards,\nAdmissions Team",
    is_active: true,
    sort_order: 60,
  },
  {
    key: "decision_rejected",
    label: "Rejection Notice",
    description: "Template for rejected decisions.",
    channel: "all",
    subject: "Application Update",
    body:
      "Dear {name},\n\nThank you for applying. After careful review, we are unable to offer a place at this time.\n\nBest regards,\nAdmissions Team",
    is_active: true,
    sort_order: 70,
  },
  {
    key: "account_credentials",
    label: "Account Credentials",
    description: "Sent automatically when admin creates a user from an application.",
    channel: "all",
    subject: "Your Digital Hub Account",
    body:
      "Dear {name},\n\n" +
      "Your student account has been created.\n" +
      "Email: {email}\n" +
      "Temporary Password: {generated_password}\n" +
      "Sign in here: {sign_in_url}\n\n" +
      "Please sign in and change your password.\n\nBest regards,\nDigital Hub Team",
    is_active: true,
    sort_order: 80,
  },
];

const MESSAGE_TEMPLATES_ENSURE_LOCK_KEY = 42100421;
let defaultsEnsured = false;
let defaultsEnsurePromise = null;

function normalizeOptionalText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function toSafeTemplateKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

async function runEnsureDefaults(client) {
  await client.query("SELECT pg_advisory_xact_lock($1)", [MESSAGE_TEMPLATES_ENSURE_LOCK_KEY]);
  await ensureMessageTemplatesTable(client);
  for (const template of DEFAULT_MESSAGE_TEMPLATES) {
    await insertDefaultMessageTemplate(template, client);
  }
  await setMessageTemplateActiveByKey("participation_confirmation", false, client);
}

async function ensureDefaults(client) {
  if (defaultsEnsured) return;

  if (!defaultsEnsurePromise) {
    defaultsEnsurePromise = runEnsureDefaults(client)
      .then(() => {
        defaultsEnsured = true;
      })
      .finally(() => {
        defaultsEnsurePromise = null;
      });
  }

  await defaultsEnsurePromise;
}

export async function listMessageTemplatesService(query) {
  return withTransaction(async (client) => {
    await ensureDefaults(client);
    const includeInactive = Boolean(query?.include_inactive);
    const result = await listMessageTemplates(includeInactive, client);
    return result.rows;
  });
}

export async function updateMessageTemplateService(key, actorUserId, payload) {
  return withTransaction(async (client) => {
    await ensureDefaults(client);
    const normalizedKey = String(key || "").trim().toLowerCase();
    const existingResult = await getMessageTemplateByKey(normalizedKey, client);
    if (!existingResult.rowCount) {
      throw new AppError(404, "MESSAGE_TEMPLATE_NOT_FOUND", "Message template not found.");
    }

    const updatePayload = {
      label: payload.label,
      description: normalizeOptionalText(payload.description),
      channel: payload.channel,
      subject: normalizeOptionalText(payload.subject),
      body: payload.body,
      is_active: payload.is_active,
      sort_order: payload.sort_order,
    };

    const { setClause, values } = buildUpdateQuery(
      updatePayload,
      ["label", "description", "channel", "subject", "body", "is_active", "sort_order"],
      1,
    );
    const updatedResult = await updateMessageTemplateByKey(normalizedKey, setClause, values, actorUserId, client);
    const updated = updatedResult.rows[0];

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.MESSAGE_TEMPLATE_UPDATED,
        entityType: "message_templates",
        entityId: updated.id,
        message: `Message template '${normalizedKey}' updated.`,
        metadata: {
          key: normalizedKey,
          updated_fields: Object.keys(payload),
        },
        title: "Message Template Updated",
        body: `Template '${updated.label}' was updated.`,
      },
      client,
    );

    return updated;
  });
}

export async function createMessageTemplateService(actorUserId, payload) {
  return withTransaction(async (client) => {
    await ensureDefaults(client);

    const key = toSafeTemplateKey(payload.key || payload.label);
    if (!key) {
      throw new AppError(400, "VALIDATION_ERROR", "Template key is required.");
    }

    const existing = await getMessageTemplateByKey(key, client);
    if (existing.rowCount) {
      throw new AppError(409, "DUPLICATE_TEMPLATE_KEY", "Template key already exists.");
    }

    const createdResult = await createMessageTemplate(
      {
        key,
        label: String(payload.label || "").trim(),
        description: normalizeOptionalText(payload.description),
        channel: payload.channel ?? "all",
        subject: normalizeOptionalText(payload.subject),
        body: String(payload.body || ""),
        is_active: payload.is_active ?? true,
        sort_order: payload.sort_order ?? 0,
        created_by: actorUserId,
      },
      client,
    );
    const created = createdResult.rows[0];

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.MESSAGE_TEMPLATE_CREATED,
        entityType: "message_templates",
        entityId: created.id,
        message: `Message template '${created.key}' created.`,
        metadata: {
          key: created.key,
          channel: created.channel,
        },
        title: "Message Template Created",
        body: `Template '${created.label}' was created.`,
      },
      client,
    );

    return created;
  });
}
