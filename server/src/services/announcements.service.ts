// File: server/src/services/announcements.service.ts
// Purpose: Implements the business rules for announcements.
// It coordinates validation, data access, and side effects before results go back to controllers.


import { withTransaction } from "../db/index.js";
import type { DbClient } from "../db/index.js";
import { countSubscribersForBroadcast, listSubscribersForBroadcast, recordSubscriberMessages } from "../repositories/subscribers.repo.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { sendDigitalHubEmail } from "../utils/mailer.js";
import { sendDigitalHubWhatsApp } from "../utils/whatsapp.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import { countAnnouncements, createAnnouncement, deleteAnnouncement, getAnnouncementById, listAnnouncements, updateAnnouncement, } from "../repositories/announcements.repo.js";

type AnnouncementPayload = {
    title: string;
    body: string;
    target_audience: string;
    cohort_id?: number | null;
    event_id?: number | null;
    is_auto?: boolean;
    is_published?: boolean;
    publish_at?: string | null;
    cta_label?: string | null;
    cta_url?: string | null;
    cta_open_in_new_tab?: boolean;
};

type AnnouncementListQuery = Record<string, unknown>;

type AnnouncementBroadcastPayload = {
    channel: "email" | "whatsapp" | "both";
    recipient_type?: "all_contacts" | "manual";
    manual_recipients?: string[];
    include_subscribers?: boolean;
};

/**
 * Derive which subscriber preference topics should receive this announcement.
 * Called automatically during broadcast - admin never picks topics manually.
 */
async function deriveSubscriberTopics(
    announcement: Record<string, unknown>,
    client: DbClient,
): Promise<string[]> {
    if (announcement.event_id) {
        return ["upcoming_events"];
    }

    if (announcement.cohort_id) {
        const cohortResult = await client.query(
            `SELECT status FROM cohorts WHERE id = $1`,
            [announcement.cohort_id],
        );
        const status = cohortResult.rows[0]?.status ?? "coming_soon";
        if (status === "open") return ["open_programs"];
        return ["upcoming_programs"];
    }

    return ["announcements"];
}
// Handles 'createAnnouncementService' workflow for this module.
export async function createAnnouncementService(adminId: number, payload: AnnouncementPayload) {
    const body = payload;
    return withTransaction(async (client: Parameters<typeof createAnnouncement>[1]) => {
        const result = await createAnnouncement({
            title: body.title,
            body: body.body,
            target_audience: body.target_audience,
            cohort_id: body.cohort_id ?? null,
            event_id: body.event_id ?? null,
            is_auto: body.is_auto ?? false,
            is_published: body.is_published ?? true,
            publish_at: body.publish_at ?? null,
            cta_label: body.cta_label ?? null,
            cta_url: body.cta_url ?? null,
            cta_open_in_new_tab: body.cta_open_in_new_tab ?? false,
            created_by: adminId,
        }, client);
        const created = result.rows[0];
        await logAdminAction({
            actorUserId: adminId,
            action: "create announcement",
            entityType: "announcements",
            entityId: created.id,
            message: `Announcement ${created.title} was created.`,
            metadata: {
                target_audience: body.target_audience,
            },
            title: "Announcement Created",
            body: `Announcement ${created.title} was created.`,
        }, client);
        return created;
    });
}
// Handles 'listAnnouncementsService' workflow for this module.
export async function listAnnouncementsService(query: AnnouncementListQuery) {
    const list = parseListQuery(query, ["id", "created_at", "publish_at", "title"], "created_at");
    const params: Array<string | number | boolean> = [];
    const where: string[] = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["title", "body"], params.length));
    }
    if (list.status) {
        if (list.status === "published") {
            where.push("is_published = TRUE");
        }
        else if (list.status === "draft") {
            where.push("is_published = FALSE");
        }
    }
    if (list.cohortId) {
        params.push(list.cohortId);
        where.push(`cohort_id = $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countAnnouncements(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listAnnouncements(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
// Handles 'patchAnnouncementService' workflow for this module.
export async function patchAnnouncementService(id: number, adminId: number, payload: Partial<AnnouncementPayload>) {
    const { setClause, values } = buildUpdateQuery(payload, ["title", "body", "target_audience", "cohort_id", "event_id", "is_auto", "is_published", "publish_at", "cta_label", "cta_url", "cta_open_in_new_tab"], 1);
    const result = await updateAnnouncement(id, setClause, values);
    if (!result.rowCount) {
        throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found.");
    }
    await logAdminAction({
        actorUserId: adminId,
        action: "update announcement",
        entityType: "announcements",
        entityId: id,
        message: `Announcement ${id} was updated.`,
        metadata: { updated_fields: Object.keys(payload) },
        title: "Announcement Updated",
        body: `Announcement #${id} was edited.`,
    });
    return result.rows[0];
}
// Handles 'deleteAnnouncementService' workflow for this module.
export async function deleteAnnouncementService(id: number, adminId: number) {
    const result = await deleteAnnouncement(id);
    if (!result.rowCount) {
        throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found.");
    }
    await logAdminAction({
        actorUserId: adminId,
        action: "delete announcement",
        entityType: "announcements",
        entityId: id,
        message: `Announcement ${id} was deleted.`,
        title: "Announcement Deleted",
        body: `Announcement #${id} was deleted.`,
    });
    return { id };
}

// Handles 'broadcastAnnouncementService' workflow for this module.
export async function broadcastAnnouncementService(
    id: number,
    adminId: number,
    payload: AnnouncementBroadcastPayload,
) {
    return withTransaction(async (client: DbClient) => {
        const announcementResult = await getAnnouncementById(id, client);
        if (!announcementResult.rowCount) {
            throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found.");
        }

        const announcement = announcementResult.rows[0];
        const subject = announcement.title;
        const ctaLine = announcement.cta_label && announcement.cta_url
            ? `${announcement.cta_label}: ${announcement.cta_url}`
            : null;
        const messageBody = [announcement.body, ctaLine].filter(Boolean).join("\n\n");

        let userSentCount = 0;
        let userSkippedCount = 0;
        let userFailedCount = 0;
        let subscriberSentCount = 0;
        let subscriberSkippedCount = 0;
        let subscriberFailedCount = 0;

        if (payload.recipient_type !== "manual") {
            const usersResult = await client.query(
                `SELECT u.id, u.email, u.phone FROM users u WHERE u.is_active = TRUE`,
            );
            for (const user of usersResult.rows) {
                const sendEmail = payload.channel === "email" || payload.channel === "both";
                const sendWa = payload.channel === "whatsapp" || payload.channel === "both";

                if (sendEmail && user.email) {
                    try {
                        await sendDigitalHubEmail({ to: user.email, subject, body: messageBody });
                        userSentCount++;
                    } catch {
                        userFailedCount++;
                    }
                }
                if (sendWa && user.phone) {
                    try {
                        await sendDigitalHubWhatsApp({ to: user.phone, body: messageBody });
                        userSentCount++;
                    } catch {
                        userFailedCount++;
                    }
                }
                if (!user.email && !user.phone) userSkippedCount++;
            }
        }

        if (payload.recipient_type === "manual" && Array.isArray(payload.manual_recipients)) {
            for (const recipient of payload.manual_recipients) {
                const isEmail = recipient.includes("@");
                try {
                    if (isEmail) {
                        await sendDigitalHubEmail({ to: recipient, subject, body: messageBody });
                    } else {
                        await sendDigitalHubWhatsApp({ to: recipient, body: messageBody });
                    }
                    userSentCount++;
                } catch {
                    userFailedCount++;
                }
            }
        }

        if (payload.include_subscribers) {
            const topics = await deriveSubscriberTopics(announcement, client);
            const subscribersResult = await listSubscribersForBroadcast(topics, id, client);
            const subscribers = subscribersResult.rows;

            const successfulIds: number[] = [];
            const subscriberOptOutLine = "\n\nReply STOP to unsubscribe.";

            for (const subscriber of subscribers) {
                try {
                    await sendDigitalHubWhatsApp({
                        to: subscriber.phone,
                        body: messageBody + subscriberOptOutLine,
                    });
                    successfulIds.push(subscriber.id);
                    subscriberSentCount++;
                } catch {
                    subscriberFailedCount++;
                }
            }

            if (successfulIds.length) {
                await recordSubscriberMessages(successfulIds, id, client);
            }
        }

        await logAdminAction({
            actorUserId: adminId,
            action: "broadcast announcement",
            entityType: "announcements",
            entityId: id,
            message: `Announcement ${id} broadcast via ${payload.channel}.`,
            metadata: {
                channel: payload.channel,
                recipient_type: payload.recipient_type ?? "all_contacts",
                include_subscribers: payload.include_subscribers ?? false,
                user_sent: userSentCount,
                user_skipped: userSkippedCount,
                user_failed: userFailedCount,
                subscriber_sent: subscriberSentCount,
                subscriber_skipped: subscriberSkippedCount,
                subscriber_failed: subscriberFailedCount,
            },
            title: "Announcement Broadcast Sent",
            body: `Announcement #${id} sent to ${userSentCount} users and ${subscriberSentCount} subscribers.`,
        }, client);

        return {
            announcement_id: id,
            channel: payload.channel,
            user_sent: userSentCount,
            user_skipped: userSkippedCount,
            user_failed: userFailedCount,
            subscriber_sent: subscriberSentCount,
            subscriber_failed: subscriberFailedCount,
            include_subscribers: payload.include_subscribers ?? false,
        };
    });
}

// Handles 'broadcastPreviewService' workflow for this module.
export async function broadcastPreviewService(id: number) {
    const announcementResult = await getAnnouncementById(id);
    if (!announcementResult.rowCount) {
        throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found.");
    }
    const announcement = announcementResult.rows[0];

    const { pool } = await import("../db/index.js");
    const client = await pool.connect();
    try {
        const topics = await deriveSubscriberTopics(announcement, client);
        const subCount = await countSubscribersForBroadcast(topics, id, client);
        const userCount = await client.query(
            `SELECT COUNT(*)::int AS total FROM users WHERE is_active = TRUE`,
        );
        return {
            announcement_id: id,
            derived_topics: topics,
            user_count: Number(userCount.rows[0]?.total ?? 0),
            subscriber_count: Number(subCount.rows[0]?.total ?? 0),
        };
    } finally {
        client.release();
    }
}

