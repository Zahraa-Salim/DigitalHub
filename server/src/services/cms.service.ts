// File: server/src/services/cms.service.ts
// What this code does:
// 1) Implements core business rules and workflow decisions.
// 2) Performs data access through DB helpers and utilities.
// 3) Enforces domain constraints before state changes.
// 4) Returns structured results for controller/route layers.
// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { withTransaction } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { cacheDel } from "../utils/cache.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { countHomeSections, countMediaAssets, countPages, countThemeTokens, createMediaAsset, createThemeToken, ensureDefaultHomeSections, ensureDefaultPages, ensureSiteSettingsRow, getSiteSettings, listHomeSections, listMediaAssets, listPages, listThemeTokens, updateHomeSection, updatePage, updateSiteSettings, updateThemeToken, } from "../repositories/cms.repo.js";

const CMS_MEDIA_MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
};
const MAX_CMS_MEDIA_BYTES = 6 * 1024 * 1024;
function sanitizeFilenamePart(value) {
    return String(value || "media")
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "media";
}
function normalizeTagList(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    return Array.from(new Set(values
        .map((entry) => String(entry || "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 20)));
}
function decodeBase64Image(input) {
    const raw = String(input || "").trim();
    if (!raw) {
        throw new AppError(400, "VALIDATION_ERROR", "Media file data is required.");
    }
    const cleaned = raw.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "").replace(/\s+/g, "");
    try {
        return Buffer.from(cleaned, "base64");
    }
    catch (_error) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid media payload.");
    }
}
export async function getCmsSiteSettings() {
    const result = await getSiteSettings();
    if (!result.rowCount) {
        throw new AppError(404, "SITE_SETTINGS_NOT_FOUND", "Site settings were not found.");
    }
    return result.rows[0];
}
export async function patchCmsSiteSettings(adminId, payload) {
    const updated = await withTransaction(async (client) => {
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
    await cacheDel("public:home");
    return updated;
}
export async function listCmsPages(query) {
    await ensureDefaultPages();
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
    const updated = await withTransaction(async (client) => {
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
    await cacheDel(`public:page:${String(updated.key || "").trim().toLowerCase()}`);
    return updated;
}
export async function listCmsHomeSections(query) {
    await ensureDefaultHomeSections();
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
export async function listCmsMedia(query) {
    const list = parseListQuery(query, ["id", "file_name", "original_name", "mime_type", "size_bytes", "created_at", "updated_at"], "created_at");
    const params = [];
    const where = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["file_name", "COALESCE(original_name, '')", "COALESCE(alt_text, '')"], params.length));
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countMediaAssets(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listMediaAssets(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
export async function uploadCmsMedia(adminId, payload) {
    const mimeType = String(payload.mime_type || "").trim().toLowerCase();
    const extension = CMS_MEDIA_MIME_TO_EXT[mimeType];
    if (!extension) {
        throw new AppError(400, "VALIDATION_ERROR", "Unsupported media mime type.");
    }
    const fileBuffer = decodeBase64Image(payload.data_base64);
    if (!fileBuffer.length) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid media payload.");
    }
    if (fileBuffer.length > MAX_CMS_MEDIA_BYTES) {
        throw new AppError(400, "VALIDATION_ERROR", "Media file must be 6MB or less.");
    }
    const safeBase = sanitizeFilenamePart(payload.filename || payload.alt_text || "media");
    const fileName = `${adminId}-${Date.now()}-${randomBytes(8).toString("hex")}-${safeBase}.${extension}`;
    const storagePath = `cms/${fileName}`;
    const uploadsDir = path.resolve(process.cwd(), "uploads", "cms");
    const filePath = path.join(uploadsDir, fileName);
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    await fs.promises.writeFile(filePath, fileBuffer);
    const created = await withTransaction(async (client) => {
        const result = await createMediaAsset({
            file_name: fileName,
            original_name: payload.filename || null,
            mime_type: mimeType,
            size_bytes: fileBuffer.length,
            storage_path: storagePath,
            public_url: `/uploads/${storagePath}`,
            alt_text: payload.alt_text || null,
            tags: normalizeTagList(payload.tags),
            created_by: adminId,
        }, client);
        const asset = result.rows[0];
        await logAdminAction({
            actorUserId: adminId,
            action: "upload media",
            entityType: "media_assets",
            entityId: asset.id,
            message: `Media asset ${asset.file_name} was uploaded.`,
            metadata: {
                mime_type: mimeType,
                size_bytes: fileBuffer.length,
                public_url: asset.public_url,
            },
            title: "Media Uploaded",
            body: "A CMS media file was uploaded.",
        }, client);
        return asset;
    });
    return created;
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


