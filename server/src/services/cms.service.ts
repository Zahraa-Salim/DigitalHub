// File Summary: server/src/services/cms.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { cacheDel } from "../utils/cache.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { countHomeSections, countPages, countThemeTokens, createThemeToken, ensureSiteSettingsRow, getSiteSettings, listHomeSections, listPages, listThemeTokens, updateHomeSection, updatePage, updateSiteSettings, updateThemeToken, } from "../repositories/cms.repo.js";
export async function getCmsSiteSettings() {
    const result = await getSiteSettings();
    if (!result.rowCount) {
        throw new AppError(404, "SITE_SETTINGS_NOT_FOUND", "Site settings were not found.");
    }
    return result.rows[0];
}
export async function patchCmsSiteSettings(adminId, payload) {
    return withTransaction(async (client) => {
        const allowedColumns = ["site_name", "default_event_location", "contact_info", "social_links"];
        const { setClause, values } = buildUpdateQuery(payload, allowedColumns, 1);
        await ensureSiteSettingsRow(adminId, client);
        const result = await updateSiteSettings(setClause, values, adminId, client);
        await logAdminAction({
            actorUserId: adminId,
            action: "edit site settings",
            entityType: "site_settings",
            entityId: 1,
            message: "Site settings were updated.",
            metadata: {
                updated_fields: Object.keys(payload),
            },
            title: "CMS Updated",
            body: "Site settings were edited.",
        }, client);
        return result.rows[0];
    });
}
export async function listCmsPages(query) {
    const list = parseListQuery(query, ["id", "key", "title", "updated_at"], "updated_at");
    const params = [];
    const where = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["key", "COALESCE(title, '')"], params.length));
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countPages(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listPages(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
export async function patchCmsPage(id, adminId, payload) {
    return withTransaction(async (client) => {
        const allowedColumns = ["title", "content", "is_published"];
        const { setClause, values } = buildUpdateQuery(payload, allowedColumns, 1);
        const result = await updatePage(id, setClause, values, adminId, client);
        if (!result.rowCount) {
            throw new AppError(404, "PAGE_NOT_FOUND", "Page not found.");
        }
        await logAdminAction({
            actorUserId: adminId,
            action: "edit pages",
            entityType: "pages",
            entityId: id,
            message: `Page ${id} was updated.`,
            metadata: {
                updated_fields: Object.keys(payload),
            },
            title: "CMS Updated",
            body: "A page was edited.",
        }, client);
        return result.rows[0];
    });
}
export async function listCmsHomeSections(query) {
    const list = parseListQuery(query, ["id", "key", "title", "sort_order", "updated_at"], "sort_order");
    const params = [];
    const where = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["key", "COALESCE(title, '')"], params.length));
    }
    if (list.status) {
        if (list.status === "enabled") {
            where.push("is_enabled = TRUE");
        }
        else if (list.status === "disabled") {
            where.push("is_enabled = FALSE");
        }
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countHomeSections(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listHomeSections(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
export async function patchCmsHomeSection(id, adminId, payload) {
    const updated = await withTransaction(async (client) => {
        const allowedColumns = ["title", "is_enabled", "sort_order", "content"];
        const { setClause, values } = buildUpdateQuery(payload, allowedColumns, 1);
        const result = await updateHomeSection(id, setClause, values, adminId, client);
        if (!result.rowCount) {
            throw new AppError(404, "HOME_SECTION_NOT_FOUND", "Home section not found.");
        }
        await logAdminAction({
            actorUserId: adminId,
            action: "edit home sections",
            entityType: "home_sections",
            entityId: id,
            message: `Home section ${id} was updated.`,
            metadata: {
                updated_fields: Object.keys(payload),
            },
            title: "CMS Updated",
            body: "A home section was edited.",
        }, client);
        return result.rows[0];
    });
    await cacheDel("public:home");
    return updated;
}
export async function listCmsThemeTokens(query) {
    const list = parseListQuery(query, ["id", "key", "purpose", "scope", "updated_at"], "updated_at");
    const params = [];
    const where = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["key", "purpose", "value", "scope"], params.length));
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countThemeTokens(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listThemeTokens(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
export async function createCmsThemeToken(adminId, input) {
    const created = await withTransaction(async (client) => {
        const result = await createThemeToken(input.key, input.purpose, input.value, input.scope, adminId, client);
        const created = result.rows[0];
        await logAdminAction({
            actorUserId: adminId,
            action: "edit theme tokens",
            entityType: "theme_tokens",
            entityId: created.id,
            message: `Theme token ${input.key} was created.`,
            metadata: { key: input.key, scope: input.scope },
            title: "Theme Token Created",
            body: `Theme token ${input.key} was created.`,
        }, client);
        return created;
    });
    await cacheDel("public:theme");
    return created;
}
export async function patchCmsThemeToken(id, adminId, payload) {
    const updated = await withTransaction(async (client) => {
        const allowedColumns = ["key", "purpose", "value", "scope"];
        const { setClause, values } = buildUpdateQuery(payload, allowedColumns, 1);
        const result = await updateThemeToken(id, setClause, values, adminId, client);
        if (!result.rowCount) {
            throw new AppError(404, "THEME_TOKEN_NOT_FOUND", "Theme token not found.");
        }
        await logAdminAction({
            actorUserId: adminId,
            action: "edit theme tokens",
            entityType: "theme_tokens",
            entityId: id,
            message: `Theme token ${id} was updated.`,
            metadata: {
                updated_fields: Object.keys(payload),
            },
            title: "Theme Token Updated",
            body: "A theme token was edited.",
        }, client);
        return result.rows[0];
    });
    await cacheDel("public:theme");
    return updated;
}


