// File Summary: server/src/services/overview.service.ts
// Layer: services
// Purpose: Contains business logic for admin overview aggregations.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { ADMIN_ACTIONS } from "../constants/adminActions.js";
import { listFailedMessagesForOverviewRetry, getAdminOverviewAggregates } from "../repositories/overview.repo.js";
import { sendApplicationMessageService } from "./applications.service.js";
import { sendProgramApplicationMessageService } from "./programApplications.service.js";
import { logAdminAction } from "../utils/logAdminAction.js";

export async function getAdminOverviewService(user) {
  const includeSuperAdmin = user?.role === "super_admin";
  return getAdminOverviewAggregates(includeSuperAdmin);
}

export async function retryFailedOverviewMessagesService(actorUserId, payload) {
  const channel = payload?.channel === "whatsapp" ? "whatsapp" : "email";
  const limit = Math.max(1, Math.min(200, Number(payload?.limit ?? 50)));
  const rowsResult = await listFailedMessagesForOverviewRetry(channel, limit);
  const rows = rowsResult.rows || [];

  const retried = [];
  const failed = [];
  const skipped = [];

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
    } catch (error) {
      failed.push({
        id: Number(row.id),
        error: String(error?.message || error),
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
