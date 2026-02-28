// File Summary: server/src/services/public.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { AppError } from "../utils/appError.js";
import { buildSearchClause } from "../utils/sql.js";
import { cacheGetJson, cacheSetJson } from "../utils/cache.js";
import { countPublicResources, getPublicSiteSettings, getPublicStudentBySlug, listPublicAdmins, listPublicHomeSections, listPublicResources, listPublicThemeTokens, } from "../repositories/public.repo.js";
import { listPublicProjectsByStudentUserId } from "../repositories/projects.repository.js";
async function listPublicResource(query, config) {
    const list = parseListQuery(query, config.sortableColumns, config.defaultSort);
    const params = [];
    const where = [...config.extraWhere];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(config.searchableColumns, params.length));
    }
    if (config.featuredFilterColumn && list.featured !== undefined) {
        params.push(list.featured);
        where.push(`${config.featuredFilterColumn} = $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countPublicResources(config.resourceConfig.tableExpression, whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listPublicResources(config.resourceConfig, whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
const programsConfig = {
    sortableColumns: ["id", "title", "created_at", "updated_at"],
    defaultSort: "updated_at",
    searchableColumns: ["p.title", "p.slug", "COALESCE(p.summary, '')"],
    extraWhere: ["p.is_published = TRUE", "p.deleted_at IS NULL"],
    resourceConfig: {
        tableExpression: "programs p",
        selectFields: "p.id, p.slug, p.title, p.summary, p.description, p.requirements, p.default_capacity, p.created_at, p.updated_at",
        sortPrefix: "p",
    },
};
const cohortsConfig = {
    sortableColumns: ["id", "name", "start_date", "created_at"],
    defaultSort: "start_date",
    searchableColumns: ["c.name", "p.title"],
    extraWhere: ["p.is_published = TRUE", "p.deleted_at IS NULL", "c.deleted_at IS NULL", "c.status <> 'cancelled'"],
    resourceConfig: {
        tableExpression: "cohorts c JOIN programs p ON p.id = c.program_id",
        selectFields: "c.id, c.program_id, p.title AS program_title, c.name, CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS status, CASE WHEN c.status = 'open' THEN TRUE ELSE FALSE END AS allow_applications, c.capacity, c.enrollment_open_at, c.enrollment_close_at, c.start_date, c.end_date, c.created_at, c.updated_at",
        sortPrefix: "c",
    },
};
const eventsConfig = {
    sortableColumns: ["id", "starts_at", "created_at", "title"],
    defaultSort: "starts_at",
    searchableColumns: ["e.title", "COALESCE(e.description, '')", "COALESCE(e.location, '')"],
    extraWhere: ["e.is_published = TRUE", "e.deleted_at IS NULL"],
    resourceConfig: {
        tableExpression: "events e",
        selectFields: "e.id, e.slug, e.title, e.description, e.location, e.starts_at, e.ends_at, e.is_done, e.done_at, e.created_at, e.updated_at",
        sortPrefix: "e",
    },
};
const announcementsConfig = {
    sortableColumns: ["id", "created_at", "publish_at", "title"],
    defaultSort: "created_at",
    searchableColumns: ["a.title", "a.body"],
    extraWhere: ["a.is_published = TRUE", "a.deleted_at IS NULL", "a.target_audience IN ('website', 'all')"],
    resourceConfig: {
        tableExpression: "announcements a",
        selectFields: "a.id, a.title, a.body, a.target_audience, a.cohort_id, a.publish_at, a.created_at",
        sortPrefix: "a",
    },
};
const managersConfig = {
    sortableColumns: ["user_id", "full_name", "sort_order", "created_at"],
    defaultSort: "sort_order",
    searchableColumns: ["ap.full_name", "COALESCE(ap.job_title, '')", "COALESCE(ap.bio, '')", "COALESCE(ap.admin_role, '')"],
    extraWhere: ["ap.is_public = TRUE"],
    resourceConfig: {
        tableExpression: "admin_profiles ap",
        selectFields: "ap.user_id, ap.full_name, ap.avatar_url, ap.bio, ap.job_title, ap.admin_role, ap.linkedin_url, ap.github_url, ap.portfolio_url, ap.sort_order",
        sortPrefix: "ap",
    },
};
const instructorsConfig = {
    sortableColumns: ["user_id", "full_name", "created_at"],
    defaultSort: "created_at",
    searchableColumns: ["ip.full_name", "COALESCE(ip.expertise, '')", "COALESCE(ip.bio, '')"],
    extraWhere: ["ip.is_public = TRUE"],
    resourceConfig: {
        tableExpression: "instructor_profiles ip",
        selectFields: "ip.user_id, ip.full_name, ip.avatar_url, ip.bio, ip.expertise, ip.linkedin_url, ip.github_url, ip.portfolio_url",
        sortPrefix: "ip",
    },
};
const studentsConfig = {
    sortableColumns: ["user_id", "full_name", "featured_rank", "created_at"],
    defaultSort: "featured_rank",
    searchableColumns: ["sp.full_name", "COALESCE(sp.bio, '')"],
    extraWhere: ["sp.is_public = TRUE"],
    resourceConfig: {
        tableExpression: "student_profiles sp",
        selectFields: "sp.user_id, sp.full_name, sp.avatar_url, sp.bio, sp.linkedin_url, sp.github_url, sp.portfolio_url, sp.featured, sp.featured_rank, sp.public_slug",
        sortPrefix: "sp",
    },
    featuredFilterColumn: "sp.featured",
};
export function listPublicProgramsService(query) {
    return listPublicResource(query, programsConfig);
}
export function listPublicCohortsService(query) {
    return listPublicResource(query, cohortsConfig);
}
export function listPublicEventsService(query) {
    return listPublicResource(query, eventsConfig);
}
export function listPublicAnnouncementsService(query) {
    return listPublicResource(query, announcementsConfig);
}
export function listPublicManagersService(query) {
    return listPublicResource(query, managersConfig);
}
export function listPublicInstructorsService(query) {
    return listPublicResource(query, instructorsConfig);
}
export function listPublicStudentsService(query) {
    return listPublicResource(query, studentsConfig);
}
export async function getPublicStudentDetailService(publicSlug) {
    const profileResult = await getPublicStudentBySlug(publicSlug);
    if (!profileResult.rowCount) {
        throw new AppError(404, "NOT_FOUND", "Student profile not found.");
    }
    const profile = profileResult.rows[0];
    const projectsResult = await listPublicProjectsByStudentUserId(Number(profile.user_id));
    return {
        ...profile,
        projects: projectsResult.rows,
    };
}
export async function getPublicThemeService() {
    const cacheKey = "public:theme";
    const cached = await cacheGetJson(cacheKey);
    if (cached !== null) {
        return cached;
    }
    const result = await listPublicThemeTokens();
    const data = result.rows;
    await cacheSetJson(cacheKey, data, 600);
    return data;
}
export async function getPublicHomeService() {
    const cacheKey = "public:home";
    const cached = await cacheGetJson(cacheKey);
    if (cached !== null) {
        return cached;
    }
    const [sectionsResult, settingsResult] = await Promise.all([
        listPublicHomeSections(),
        getPublicSiteSettings(),
    ]);
    const data = {
        sections: sectionsResult.rows,
        site_settings: settingsResult.rowCount ? settingsResult.rows[0] : null,
    };
    await cacheSetJson(cacheKey, data, 60);
    return data;
}
export async function listPublicAdminsService() {
    const result = await listPublicAdmins();
    return result.rows;
}


