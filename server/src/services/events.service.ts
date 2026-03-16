// File: server/src/services/events.service.ts
// Purpose: Implements the business rules for events.
// It coordinates validation, data access, and side effects before results go back to controllers.


import { withTransaction } from "../db/index.js";
import {
    createAnnouncement,
    deleteAnnouncement,
    findActiveAutoAnnouncementByEventId,
    updateAnnouncement,
} from "../repositories/announcements.repo.js";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import { countEvents, createEvent, deleteEvent, listEvents, markEventDone, updateEvent, } from "../repositories/events.repo.js";

const EVENT_IMAGE_MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

const MAX_EVENT_IMAGE_BYTES = 3 * 1024 * 1024;

type EventPayload = {
    slug?: string;
    title?: string;
    description?: string | null;
    post_body?: string | null;
    location?: string | null;
    starts_at?: string;
    ends_at?: string | null;
    is_published?: boolean;
    auto_announce?: boolean;
    is_done?: boolean;
    done_at?: string | null;
    completion_image_urls?: unknown;
    mime_type?: string;
    data_base64?: string;
    filename?: string;
};

type EventListQuery = Record<string, unknown>;

type EventRecord = {
    id: number;
    slug?: string | null;
    title?: string | null;
    location?: string | null;
    starts_at?: string | null;
    is_published?: boolean | null;
    is_done?: boolean | null;
    auto_announce?: boolean | null;
};

// Handles 'sanitizeFilenamePart' workflow for this module.
function sanitizeFilenamePart(value: unknown): string {
    return String(value || "event-image")
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "event-image";
}

// Handles 'normalizeCompletionImageUrls' workflow for this module.
function normalizeCompletionImageUrls(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const normalized = value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean);
    return Array.from(new Set(normalized));
}

// Handles 'isEventUpcoming' workflow for this module.
function isEventUpcoming(event: EventRecord | null | undefined): boolean {
    const startsAt = new Date(event?.starts_at || "");
    return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() >= Date.now();
}

// Handles 'buildEventAnnouncementContent' workflow for this module.
function buildEventAnnouncementContent(event: EventRecord, siteUrl = "") {
    const base = siteUrl ? siteUrl.replace(/\/$/, "") : "";
    const slug = event?.slug || "";
    const ctaUrl = slug ? `${base}/events/${slug}` : null;
    return {
        title: `${event?.title || `Event #${event.id}`} is coming up`,
        body: `Join us for ${event?.title}${event?.location ? ` at ${event.location}` : ""}. Save the date and review the event details before it starts.`,
        cta_label: "View Event",
        cta_url: ctaUrl,
    };
}

// Handles 'syncEventAnnouncement' workflow for this module.
async function syncEventAnnouncement(adminId: number, event: EventRecord | null | undefined, autoAnnounce: boolean | null | undefined, dbClient: Parameters<typeof createAnnouncement>[1]) {
    if (!event?.id) {
        return;
    }

    const existingResult = await findActiveAutoAnnouncementByEventId(event.id, dbClient);
    const existing = existingResult.rows[0] ?? null;
    const shouldShow =
        Boolean(autoAnnounce) &&
        Boolean(event.is_published) &&
        !Boolean(event.is_done) &&
        isEventUpcoming(event);

    if (!shouldShow) {
        if (existing) {
            await deleteAnnouncement(existing.id, dbClient);
        }
        return;
    }

    const content = buildEventAnnouncementContent(event, process.env.PUBLIC_SITE_URL || "");
    if (existing) {
        await updateAnnouncement(
            existing.id,
            "title = $1, body = $2, target_audience = $3, is_published = $4, publish_at = $5, cohort_id = NULL, cta_label = $6, cta_url = $7, cta_open_in_new_tab = TRUE",
            [content.title, content.body, "website", true, new Date().toISOString(), content.cta_label, content.cta_url],
            dbClient,
        );
        return;
    }

    await createAnnouncement({
        title: content.title,
        body: content.body,
        target_audience: "website",
        cohort_id: null,
        event_id: event.id,
        is_auto: true,
        is_published: true,
        publish_at: new Date().toISOString(),
        cta_label: content.cta_label,
        cta_url: content.cta_url,
        cta_open_in_new_tab: true,
        created_by: adminId,
    }, dbClient);
}

// Handles 'createEventService' workflow for this module.
export async function createEventService(adminId: number, payload: EventPayload) {
    const body = payload;
    return withTransaction(async (client: Parameters<typeof createEvent>[1]) => {
        const result = await createEvent({
            slug: body.slug,
            title: body.title,
            description: body.description ?? null,
            post_body: body.post_body ?? null,
            location: body.location ?? null,
            starts_at: body.starts_at,
            ends_at: body.ends_at ?? null,
            is_published: body.is_published ?? false,
            auto_announce: body.auto_announce ?? false,
            completion_image_urls: normalizeCompletionImageUrls(body.completion_image_urls),
            created_by: adminId,
        }, client);
        const created = result.rows[0];
        await syncEventAnnouncement(adminId, created, created.auto_announce, client);
        await logAdminAction({
            actorUserId: adminId,
            action: "create event",
            entityType: "events",
            entityId: created.id,
            message: `Event ${created.title} was created.`,
            title: "Event Created",
            body: `Event ${created.title} was created.`,
        }, client);
        return created;
    });
}
// Handles 'listEventsService' workflow for this module.
export async function listEventsService(query: EventListQuery) {
    const list = parseListQuery(query, ["id", "starts_at", "created_at", "title"], "starts_at");
    const params: string[] = [];
    const where: string[] = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["title", "COALESCE(description, '')", "COALESCE(location, '')"], params.length));
    }
    if (list.status) {
        if (list.status === "done") {
            where.push("is_done = TRUE");
        }
        else if (list.status === "upcoming") {
            where.push("is_done = FALSE");
        }
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countEvents(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listEvents(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
// Handles 'patchEventService' workflow for this module.
export async function patchEventService(id: number, adminId: number, payload: EventPayload) {
    return withTransaction(async (client: Parameters<typeof createEvent>[1]) => {
        const currentResult = await listEvents("WHERE id = $1", "id", "desc", [id], 1, 0, client);
        if (!currentResult.rowCount) {
            throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
        }

        const current = currentResult.rows[0];
        const normalizedPayload = {
            ...payload,
            auto_announce:
                payload.auto_announce !== undefined ? Boolean(payload.auto_announce) : Boolean(current.auto_announce),
        };

        if (normalizedPayload.completion_image_urls !== undefined) {
            normalizedPayload.completion_image_urls = JSON.stringify(normalizeCompletionImageUrls(normalizedPayload.completion_image_urls));
        }

        const built = buildUpdateQuery(
            normalizedPayload,
            ["slug", "title", "description", "post_body", "location", "starts_at", "ends_at", "is_published", "auto_announce", "is_done", "done_at", "completion_image_urls"],
            1,
        );
        const setClause = built.setClause.replace(/completion_image_urls = \$(\d+)/, (_match, index) => `completion_image_urls = $${index}::jsonb`);
        const values = built.values;
        const result = await updateEvent(id, setClause, values, client);
        if (!result.rowCount) {
            throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
        }

        const updated = result.rows[0];
        await syncEventAnnouncement(adminId, updated, updated.auto_announce, client);

        await logAdminAction({
            actorUserId: adminId,
            action: "update event",
            entityType: "events",
            entityId: id,
            message: `Event ${id} was updated.`,
            metadata: { updated_fields: Object.keys(normalizedPayload) },
            title: "Event Updated",
            body: `Event #${id} was edited.`,
        }, client);

        return updated;
    });
}
// Handles 'deleteEventService' workflow for this module.
export async function deleteEventService(id: number, adminId: number) {
    return withTransaction(async (client: Parameters<typeof createEvent>[1]) => {
        const existingAnnouncement = await findActiveAutoAnnouncementByEventId(id, client);
        const result = await deleteEvent(id, client);
        if (!result.rowCount) {
            throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
        }
        if (existingAnnouncement.rowCount) {
            await deleteAnnouncement(existingAnnouncement.rows[0].id, client);
        }
        await logAdminAction({
            actorUserId: adminId,
            action: "delete event",
            entityType: "events",
            entityId: id,
            message: `Event ${id} was deleted.`,
            title: "Event Deleted",
            body: `Event #${id} was deleted.`,
        }, client);
        return { id };
    });
}
// Handles 'markEventDoneService' workflow for this module.
export async function markEventDoneService(id: number, adminId: number) {
    return withTransaction(async (client: Parameters<typeof createEvent>[1]) => {
        const result = await markEventDone(id, client);
        if (!result.rowCount) {
            throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
        }
        await syncEventAnnouncement(adminId, result.rows[0], result.rows[0].auto_announce, client);
        await logAdminAction({
            actorUserId: adminId,
            action: "mark event done",
            entityType: "events",
            entityId: id,
            message: `Event ${id} was marked as done.`,
            title: "Event Completed",
            body: `Event #${id} was marked as completed.`,
        }, client);
        return result.rows[0];
    });
}

// Handles 'uploadEventImageService' workflow for this module.
export async function uploadEventImageService(actorUserId: number, payload: EventPayload) {
    const mimeType = String(payload.mime_type || "").trim().toLowerCase();
    const extension = EVENT_IMAGE_MIME_TO_EXT[mimeType as keyof typeof EVENT_IMAGE_MIME_TO_EXT];
    if (!extension) {
        throw new AppError(400, "VALIDATION_ERROR", "Unsupported event image mime type.");
    }
    const base64Raw = String(payload.data_base64 || "").trim();
    if (!base64Raw) {
        throw new AppError(400, "VALIDATION_ERROR", "Event image data is required.");
    }
    const normalizedBase64 = base64Raw.replace(/\s+/g, "");
    let fileBuffer = null;
    try {
        fileBuffer = Buffer.from(normalizedBase64, "base64");
    }
    catch (_error) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid event image payload.");
    }
    if (!fileBuffer || !fileBuffer.length) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid event image payload.");
    }
    if (fileBuffer.length > MAX_EVENT_IMAGE_BYTES) {
        throw new AppError(400, "VALIDATION_ERROR", "Event image must be 3MB or less.");
    }
    const safeBase = sanitizeFilenamePart(payload.filename);
    const fileName = `${actorUserId}-${Date.now()}-${randomBytes(8).toString("hex")}-${safeBase}.${extension}`;
    const eventsDir = path.resolve(process.cwd(), "uploads", "events");
    const filePath = path.join(eventsDir, fileName);
    await fs.promises.mkdir(eventsDir, { recursive: true });
    await fs.promises.writeFile(filePath, fileBuffer);
    const imageUrl = `/uploads/events/${fileName}`;
    await logAdminAction({
        actorUserId,
        action: "event image uploaded",
        entityType: "events",
        entityId: actorUserId,
        message: `Event image uploaded by admin ${actorUserId}.`,
        metadata: {
            mime_type: mimeType,
            bytes: fileBuffer.length,
            image_url: imageUrl,
        },
        title: "Event Image Uploaded",
        body: "Event image uploaded successfully.",
    });
    return { image_url: imageUrl };
}

