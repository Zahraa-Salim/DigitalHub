// File Summary: server/src/services/announcements.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import { countAnnouncements, createAnnouncement, deleteAnnouncement, listAnnouncements, updateAnnouncement, } from "../repositories/announcements.repo.js";
export async function createAnnouncementService(adminId, payload) {
    const body = payload;
    return withTransaction(async (client) => {
        const result = await createAnnouncement({
            title: body.title,
            body: body.body,
            target_audience: body.target_audience,
            cohort_id: body.cohort_id ?? null,
            is_auto: body.is_auto ?? false,
            is_published: body.is_published ?? true,
            publish_at: body.publish_at ?? null,
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
export async function listAnnouncementsService(query) {
    const list = parseListQuery(query, ["id", "created_at", "publish_at", "title"], "created_at");
    const params = [];
    const where = [];
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
export async function patchAnnouncementService(id, adminId, payload) {
    const { setClause, values } = buildUpdateQuery(payload, ["title", "body", "target_audience", "cohort_id", "is_auto", "is_published", "publish_at"], 1);
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
export async function deleteAnnouncementService(id, adminId) {
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


