// File Summary: server/src/services/logs.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { logsFiltersSchema } from "../schemas/logs.schemas.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause } from "../utils/sql.js";
import { countLogs, listLogs } from "../repositories/logs.repo.js";
export async function listActivityLogsService(query) {
    const list = parseListQuery(query, ["id", "created_at", "action", "entity_type", "actor_user_id"], "created_at");
    const filters = logsFiltersSchema.parse({
        actor_user_id: query.actor_user_id,
        action: query.action,
        entity_type: query.entity_type,
        date_from: query.date_from,
        date_to: query.date_to,
    });
    const params = [];
    const where = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["message", "action", "entity_type"], params.length));
    }
    if (filters.actor_user_id !== undefined) {
        params.push(filters.actor_user_id);
        where.push(`actor_user_id = $${params.length}`);
    }
    if (filters.action) {
        params.push(filters.action);
        where.push(`action = $${params.length}`);
    }
    if (filters.entity_type) {
        params.push(filters.entity_type);
        where.push(`entity_type = $${params.length}`);
    }
    if (filters.date_from) {
        params.push(filters.date_from);
        where.push(`created_at >= $${params.length}::timestamptz`);
    }
    if (filters.date_to) {
        params.push(filters.date_to);
        where.push(`created_at <= $${params.length}::timestamptz`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countLogs(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listLogs(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}


