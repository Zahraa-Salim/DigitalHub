// File Summary: server/src/services/events.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
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

function sanitizeFilenamePart(value) {
    return String(value || "event-image")
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "event-image";
}

function normalizeCompletionImageUrls(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const normalized = value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean);
    return Array.from(new Set(normalized));
}

export async function createEventService(adminId, payload) {
    const body = payload;
    return withTransaction(async (client) => {
        const result = await createEvent({
            slug: body.slug,
            title: body.title,
            description: body.description ?? null,
            post_body: body.post_body ?? null,
            location: body.location ?? null,
            starts_at: body.starts_at,
            ends_at: body.ends_at ?? null,
            is_published: body.is_published ?? false,
            completion_image_urls: normalizeCompletionImageUrls(body.completion_image_urls),
            created_by: adminId,
        }, client);
        const created = result.rows[0];
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
export async function listEventsService(query) {
    const list = parseListQuery(query, ["id", "starts_at", "created_at", "title"], "starts_at");
    const params = [];
    const where = [];
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
export async function patchEventService(id, adminId, payload) {
    const normalizedPayload = {
        ...payload,
    };
    if (normalizedPayload.completion_image_urls !== undefined) {
        normalizedPayload.completion_image_urls = JSON.stringify(normalizeCompletionImageUrls(normalizedPayload.completion_image_urls));
    }
    const built = buildUpdateQuery(normalizedPayload, ["slug", "title", "description", "post_body", "location", "starts_at", "ends_at", "is_published", "is_done", "done_at", "completion_image_urls"], 1);
    const setClause = built.setClause.replace(/completion_image_urls = \$(\d+)/, (_match, index) => `completion_image_urls = $${index}::jsonb`);
    const values = built.values;
    const result = await updateEvent(id, setClause, values);
    if (!result.rowCount) {
        throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
    }
    const updated = result.rows[0];
    await logAdminAction({
        actorUserId: adminId,
        action: "update event",
        entityType: "events",
        entityId: id,
        message: `Event ${id} was updated.`,
        metadata: { updated_fields: Object.keys(normalizedPayload) },
        title: "Event Updated",
        body: `Event #${id} was edited.`,
    });
    return updated;
}
export async function deleteEventService(id, adminId) {
    const result = await deleteEvent(id);
    if (!result.rowCount) {
        throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
    }
    await logAdminAction({
        actorUserId: adminId,
        action: "delete event",
        entityType: "events",
        entityId: id,
        message: `Event ${id} was deleted.`,
        title: "Event Deleted",
        body: `Event #${id} was deleted.`,
    });
    return { id };
}
export async function markEventDoneService(id, adminId) {
    const result = await markEventDone(id);
    if (!result.rowCount) {
        throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
    }
    await logAdminAction({
        actorUserId: adminId,
        action: "mark event done",
        entityType: "events",
        entityId: id,
        message: `Event ${id} was marked as done.`,
        title: "Event Completed",
        body: `Event #${id} was marked as completed.`,
    });
    return result.rows[0];
}

export async function uploadEventImageService(actorUserId, payload) {
    const mimeType = String(payload.mime_type || "").trim().toLowerCase();
    const extension = EVENT_IMAGE_MIME_TO_EXT[mimeType];
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


