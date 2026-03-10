// File: server/src/services/overview.service.ts
// Purpose: Implements the business rules for overview.
// It coordinates validation, data access, and side effects before results go back to controllers.


import { ADMIN_ACTIONS } from "../constants/adminActions.js";
import {
  deleteOverviewMessageById,
  getOverviewMessageById,
  listFailedMessagesForOverviewRetry,
  getAdminOverviewAggregates,
  listOverviewMessages,
} from "../repositories/overview.repo.js";
import { sendApplicationMessageService } from "./applications.service.js";
import { sendProgramApplicationMessageService } from "./programApplications.service.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";

type OverviewActor = {
  role?: string | null;
};

type OverviewRetryPayload = {
  channel?: string;
  limit?: number | string;
};

type OverviewQuery = Record<string, unknown>;

// Handles 'getAdminOverviewService' workflow for this module.
export async function getAdminOverviewService(user: OverviewActor) {
  const includeSuperAdmin = user?.role === "super_admin";
  return getAdminOverviewAggregates(includeSuperAdmin);
}

// Handles 'retryFailedOverviewMessagesService' workflow for this module.
export async function retryFailedOverviewMessagesService(actorUserId: number, payload: OverviewRetryPayload) {
  const channel =
    payload?.channel === "whatsapp"
      ? "whatsapp"
      : payload?.channel === "all"
        ? "all"
        : "email";
  const limit = Math.max(1, Math.min(200, Number(payload?.limit ?? 50)));
  const rowsResult = await listFailedMessagesForOverviewRetry(channel, limit);
  const rows = rowsResult.rows || [];

  const retried: Array<Record<string, number>> = [];
  const failed: Array<{ id: number; error: string }> = [];
  const skipped: Array<{ id: number; reason: string }> = [];

  for (const row of rows) {
    try {
      if (row.program_application_id) {
        await sendProgramApplicationMessageService(
          Number(row.program_application_id),
          Number(row.id),
          actorUserId,
        );
        retried.push({ id: Number(row.id), program_application_id: Number(row.program_application_id) });
        continue;
      }

      if (row.application_id) {
        await sendApplicationMessageService(
          Number(row.application_id),
          Number(row.id),
          actorUserId,
        );
        retried.push({ id: Number(row.id), application_id: Number(row.application_id) });
        continue;
      }

      skipped.push({
        id: Number(row.id),
        reason: "Message has no application_id or program_application_id.",
      });
    } catch (error: unknown) {
      failed.push({
        id: Number(row.id),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await logAdminAction({
    actorUserId,
    action: ADMIN_ACTIONS.APPLICATION_MESSAGE_SENT,
    entityType: "application_messages",
    entityId: null,
    message: `Bulk retry executed for ${channel} failed messages. Retried: ${retried.length}, Failed: ${failed.length}, Skipped: ${skipped.length}.`,
    metadata: {
      channel,
      requested_limit: limit,
      attempted: rows.length,
      retried: retried.length,
      failed: failed.length,
      skipped: skipped.length,
      failed_samples: failed.slice(0, 10),
    },
    title: "Bulk Message Retry Executed",
    body: `Bulk retry for ${channel} failed messages completed. Retried: ${retried.length}, failed: ${failed.length}, skipped: ${skipped.length}.`,
  });

  return {
    channel,
    attempted: rows.length,
    retried: retried.length,
    failed: failed.length,
    skipped: skipped.length,
    retried_messages: retried,
    failed_messages: failed,
    skipped_messages: skipped,
  };
}

// Handles 'listOverviewMessagesService' workflow for this module.
export async function listOverviewMessagesService(query: OverviewQuery) {
  return listOverviewMessages(query);
}

// Handles 'resendOverviewMessageService' workflow for this module.
export async function resendOverviewMessageService(actorUserId: number, messageId: number) {
  const messageResult = await getOverviewMessageById(messageId);
  if (!messageResult.rowCount) {
    throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found.");
  }

  const message = messageResult.rows[0];
  if (!["draft", "failed"].includes(String(message.status || ""))) {
    throw new AppError(409, "VALIDATION_ERROR", "Only draft or failed messages can be resent.");
  }

  if (message.program_application_id) {
    return sendProgramApplicationMessageService(Number(message.program_application_id), messageId, actorUserId);
  }

  if (message.application_id) {
    return sendApplicationMessageService(Number(message.application_id), messageId, actorUserId);
  }

  throw new AppError(409, "VALIDATION_ERROR", "Message is not attached to an application record.");
}

// Handles 'deleteOverviewMessageService' workflow for this module.
export async function deleteOverviewMessageService(actorUserId: number, messageId: number) {
  const deletedResult = await deleteOverviewMessageById(messageId);
  if (!deletedResult.rowCount) {
    throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found.");
  }

  const deleted = deletedResult.rows[0];
  await logAdminAction({
    actorUserId,
    action: ADMIN_ACTIONS.APPLICATION_MESSAGE_DELETED,
    entityType: "application_messages",
    entityId: Number(deleted.id),
    message: `Message ${deleted.id} deleted from delivery list.`,
    metadata: {
      channel: deleted.channel,
      status: deleted.status,
      application_id: deleted.application_id ?? null,
      program_application_id: deleted.program_application_id ?? null,
      to_value: deleted.to_value ?? null,
    },
    title: "Message Deleted",
    body: `A ${deleted.channel} message was deleted from the outbound message list.`,
  });

  return {
    id: Number(deleted.id),
    deleted: true,
    channel: deleted.channel,
    status: deleted.status,
  };
}

