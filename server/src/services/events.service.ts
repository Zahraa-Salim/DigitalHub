// File Summary: server/src/services/events.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import { countEvents, createEvent, deleteEvent, listEvents, markEventDone, updateEvent, } from "../repositories/events.repo.js";
export async function createEventService(adminId, payload) {
    const body = payload;
    return withTransaction(async (client) => {
        const result = await createEvent({
            slug: body.slug,
            title: body.title,
            description: body.description ?? null,
            location: body.location ?? null,
            starts_at: body.starts_at,
            ends_at: body.ends_at ?? null,
            is_published: body.is_published ?? false,
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
    const { setClause, values } = buildUpdateQuery(payload, ["slug", "title", "description", "location", "starts_at", "ends_at", "is_published", "is_done", "done_at"], 1);
    const result = await updateEvent(id, setClause, values);
    if (!result.rowCount) {
        throw new AppError(404, "EVENT_NOT_FOUND", "Event not found.");
    }
    await logAdminAction({
        actorUserId: adminId,
        action: "update event",
        entityType: "events",
        entityId: id,
        message: `Event ${id} was updated.`,
        metadata: { updated_fields: Object.keys(payload) },
        title: "Event Updated",
        body: `Event #${id} was edited.`,
    });
    return result.rows[0];
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


