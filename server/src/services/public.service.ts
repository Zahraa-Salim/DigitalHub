// File: server/src/services/public.service.ts
// Purpose: Implements the business rules for public.
// It coordinates validation, data access, and side effects before results go back to controllers.


import { withTransaction } from "../db/index.js";
import { ADMIN_ACTIONS } from "../constants/adminActions.js";
import { getCohortFormService } from "./forms.service.js";
import { createApplicationService } from "./applications.service.js";
import { getProgramFormService } from "./forms.service.js";
import { buildPagination, parseListQuery, parseQueryBoolean } from "../utils/pagination.js";
import { AppError } from "../utils/appError.js";
import { buildSearchClause } from "../utils/sql.js";
import { cacheGetJson, cacheSetJson } from "../utils/cache.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { countPublicResources, getPublicPageByKey, getPublicSiteSettings, getPublicStudentBySlug, listPublicHomeSections, listPublicResources, listPublicThemeTokens, } from "../repositories/public.repo.js";
import { ensureDefaultHomeSections, ensureDefaultPages } from "../repositories/cms.repo.js";
import {
    getPublicCohortById,
    listPublicCohortInstructors,
    listPublicCohortStudents,
    createApplicantForPublicApply,
    findApplicantByEmailNorm,
    findApplicantByPhoneNorm,
    getPublicEventBySlug,
    getGeneralApplyForm,
    getPublishedProgramById,
    listPublishedProgramOptions,
    listEnabledFormFieldsByFormId,
    programApplicationsTableExists,
    upsertProgramApplication,
    upsertProgramApplicationByPhone,
} from "../repositories/public.repo.js";
import { listPublicProjectsByStudentUserId } from "../repositories/projects.repository.js";
import type { DbClient } from "../db/index.js";

type AnyRecord = Record<string, any>;
type QueryParams = Record<string, any>;

// Handles 'isTransientDatabaseError' workflow for this module.
function isTransientDatabaseError(error: any) {
    if (!error || typeof error !== "object") {
        return false;
    }
    const code = String(error.code || "").toUpperCase();
    const message = String(error.message || "").toLowerCase();
    return (code === "08P01" ||
        code === "08006" ||
        code === "08001" ||
        code === "57P01" ||
        code === "ENOTFOUND" ||
        code === "EAI_AGAIN" ||
        code === "ETIMEDOUT" ||
        code === "ECONNRESET" ||
        code === "EPIPE" ||
        message.includes("authentication timed out") ||
        message.includes("getaddrinfo") ||
        message.includes("name or service not known") ||
        message.includes("connection timeout") ||
        message.includes("timeout exceeded when trying to connect") ||
        message.includes("connect etimedout") ||
        message.includes("connection terminated unexpectedly"));
}

// Handles 'withDbRetry' workflow for this module.
async function withDbRetry(handler: () => Promise<any>, retries = 1) {
    try {
        return await handler();
    }
    catch (error: any) {
        if (!isTransientDatabaseError(error) || retries <= 0) {
            throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
        return withDbRetry(handler, retries - 1);
    }
}

// Handles 'listPublicResource' workflow for this module.
async function listPublicResource(query: QueryParams, config: AnyRecord) {
    const list = parseListQuery(query, config.sortableColumns, config.defaultSort);
    const params: Array<string | number | boolean | null> = [];
    const where: string[] = [...config.extraWhere];
    if (config.statusFilterExpression && list.status) {
        const requestedStatus = String(list.status).trim().toLowerCase();
        const normalizedStatus = config.statusAliases?.[requestedStatus] || requestedStatus;
        if (config.allowedStatuses && !config.allowedStatuses.includes(normalizedStatus)) {
            throw new AppError(400, "VALIDATION_ERROR", `Unsupported status value '${list.status}'.`);
        }
        params.push(normalizedStatus);
        where.push(`${config.statusFilterExpression} = $${params.length}`);
    }
    if (config.allowApplicationsFilterExpression) {
        const allowApplications = parseQueryBoolean(query?.allow_applications, "allow_applications");
        if (allowApplications !== undefined) {
            params.push(allowApplications);
            where.push(`${config.allowApplicationsFilterExpression} = $${params.length}`);
        }
    }
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(config.searchableColumns, params.length));
    }
    if (config.featuredFilterColumn && list.featured !== undefined) {
        params.push(list.featured);
        where.push(`${config.featuredFilterColumn} = $${params.length}`);
    }
    if (config.activeOnlyWhereClause && list.activeOnly === true) {
        where.push(config.activeOnlyWhereClause);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await withDbRetry(() => countPublicResources(config.resourceConfig.tableExpression, whereClause, params));
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await withDbRetry(() => listPublicResources(config.resourceConfig, whereClause, list.sortBy, list.order, params, list.limit, list.offset));
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
        selectFields: "p.id, p.slug, p.title, p.summary, p.description, p.requirements, p.image_url, p.default_capacity, p.created_at, p.updated_at",
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
        selectFields: "c.id, c.program_id, p.title AS program_title, p.image_url AS program_image_url, p.summary AS program_summary, p.description AS program_description, p.requirements AS program_requirements, c.name, CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS status, CASE WHEN c.status = 'open' THEN TRUE ELSE FALSE END AS allow_applications, c.use_general_form, c.application_form_id, c.capacity, c.enrollment_open_at, c.enrollment_close_at, c.start_date, c.end_date, c.created_at, c.updated_at",
        sortPrefix: "c",
    },
    statusFilterExpression: "(CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END)",
    allowApplicationsFilterExpression: "(CASE WHEN c.status = 'open' THEN TRUE ELSE FALSE END)",
    allowedStatuses: ["open", "coming_soon", "running", "completed", "cancelled"],
    statusAliases: {
        planned: "coming_soon",
    },
};
const eventsConfig = {
    sortableColumns: ["id", "starts_at", "created_at", "title"],
    defaultSort: "starts_at",
    searchableColumns: ["e.title", "COALESCE(e.description, '')", "COALESCE(e.location, '')"],
    extraWhere: ["e.is_published = TRUE", "e.deleted_at IS NULL"],
    resourceConfig: {
        tableExpression: "events e",
        selectFields: "e.id, e.slug, e.title, e.description, e.post_body, e.location, e.starts_at, e.ends_at, e.is_done, e.done_at, e.completion_image_urls, e.created_at, e.updated_at",
        sortPrefix: "e",
    },
};
const announcementsConfig = {
    sortableColumns: ["id", "created_at", "publish_at", "title"],
    defaultSort: "created_at",
    searchableColumns: ["a.title", "a.body"],
    extraWhere: [
        "a.is_published = TRUE",
        "a.deleted_at IS NULL",
        "a.target_audience IN ('website', 'all')",
        "(a.cohort_id IS NULL OR (c.id IS NOT NULL AND (CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END) IN ('coming_soon', 'open')))",
        "(a.event_id IS NULL OR (e.id IS NOT NULL AND e.is_published = TRUE AND COALESCE(e.is_done, FALSE) = FALSE AND e.starts_at >= NOW()))",
    ],
    resourceConfig: {
        tableExpression: `
          announcements a
          LEFT JOIN cohorts c ON c.id = a.cohort_id AND c.deleted_at IS NULL
          LEFT JOIN programs p ON p.id = c.program_id AND p.deleted_at IS NULL
          LEFT JOIN events e ON e.id = a.event_id AND e.deleted_at IS NULL
        `,
        selectFields: `
          a.id,
          a.title,
          a.body,
          a.target_audience,
          a.cohort_id,
          a.event_id,
          a.publish_at,
          a.created_at,
          a.cta_label,
          a.cta_url,
          a.cta_open_in_new_tab,
          c.name AS cohort_name,
          CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS cohort_status,
          p.title AS program_title,
          p.image_url AS program_image_url,
          e.slug AS event_slug,
          e.title AS event_title,
          e.starts_at AS event_starts_at,
          e.featured_image_url AS event_image_url
        `,
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
        selectFields: "ap.user_id, ap.full_name, ap.avatar_url, ap.bio, ap.job_title, ap.skills, ap.admin_role, ap.linkedin_url, ap.github_url, ap.portfolio_url, ap.sort_order",
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
        selectFields: "ip.user_id, ip.full_name, ip.avatar_url, ip.bio, ip.expertise, ip.skills, ip.linkedin_url, ip.github_url, ip.portfolio_url",
        sortPrefix: "ip",
    },
};
const studentsConfig = {
    sortableColumns: ["user_id", "full_name", "featured_rank", "created_at"],
    defaultSort: "featured_rank",
    searchableColumns: ["sp.full_name", "COALESCE(sp.bio, '')"],
    extraWhere: ["sp.is_public = TRUE", "COALESCE(sp.admin_status, 'active') = 'active'"],
    activeOnlyWhereClause: "EXISTS (SELECT 1 FROM enrollments e_active WHERE e_active.student_user_id = sp.user_id AND e_active.status = 'active')",
    resourceConfig: {
        tableExpression: `
          student_profiles sp
          LEFT JOIN users u ON u.id = sp.user_id
          LEFT JOIN LATERAL (
            SELECT
              c.name AS cohort_name,
              p.title AS program_title,
              a.submitted_at AS application_submitted_at,
              COALESCE(
                NULLIF(a.submission_answers, '{}'::jsonb),
                latest_submission.answers,
                '{}'::jsonb
              ) AS answers
            FROM enrollments e
            LEFT JOIN cohorts c ON c.id = e.cohort_id AND c.deleted_at IS NULL
            LEFT JOIN programs p ON p.id = c.program_id AND p.deleted_at IS NULL
            LEFT JOIN applications a ON a.id = e.application_id
            LEFT JOIN LATERAL (
              SELECT s.answers
              FROM application_submissions s
              WHERE s.application_id = a.id
              ORDER BY s.created_at DESC, s.id DESC
              LIMIT 1
            ) latest_submission ON TRUE
            WHERE e.student_user_id = sp.user_id
            ORDER BY e.enrolled_at DESC NULLS LAST, e.id DESC
            LIMIT 1
          ) lc ON TRUE
          LEFT JOIN LATERAL (
            SELECT
              COALESCE(
                jsonb_agg(
                  DISTINCT jsonb_build_object(
                    'cohort_name', c.name,
                    'program_title', p.title
                  )
                ) FILTER (WHERE c.id IS NOT NULL),
                '[]'::jsonb
              ) AS cohorts
            FROM enrollments e
            LEFT JOIN cohorts c ON c.id = e.cohort_id AND c.deleted_at IS NULL
            LEFT JOIN programs p ON p.id = c.program_id AND p.deleted_at IS NULL
            WHERE e.student_user_id = sp.user_id
          ) cm ON TRUE
        `,
        selectFields: `
          sp.user_id,
          sp.full_name,
          sp.avatar_url,
          sp.bio,
          sp.linkedin_url,
          sp.github_url,
          sp.portfolio_url,
          sp.featured,
          sp.featured_rank,
          sp.public_slug,
          sp.is_graduated,
          sp.is_working,
          sp.open_to_work,
          sp.company_work_for,
          u.email,
          u.phone,
          lc.cohort_name,
          lc.program_title,
          cm.cohorts,
          COALESCE(
            NULLIF(lc.answers ->> 'headline', ''),
            NULLIF(lc.answers ->> 'job_title', ''),
            NULLIF(lc.answers ->> 'title', '')
          ) AS headline,
          COALESCE(
            NULLIF(lc.answers ->> 'city', ''),
            NULLIF(lc.answers ->> 'location_city', '')
          ) AS city,
          COALESCE(
            NULLIF(lc.answers ->> 'country', ''),
            NULLIF(lc.answers ->> 'location_country', '')
          ) AS country,
          COALESCE(
            NULLIF(lc.answers ->> 'location', ''),
            NULLIF(lc.answers ->> 'address', '')
          ) AS location,
          COALESCE(
            NULLIF(lc.answers ->> 'skills', ''),
            NULLIF(lc.answers ->> 'top_skills', ''),
            NULLIF(lc.answers ->> 'technical_skills', '')
          ) AS skills,
          COALESCE(
            NULLIF(lc.answers ->> 'experience_summary', ''),
            NULLIF(lc.answers ->> 'experience', '')
          ) AS experience_summary,
          COALESCE(
            NULLIF(lc.answers ->> 'education', ''),
            NULLIF(lc.answers ->> 'education_level', '')
          ) AS education,
          COALESCE(
            NULLIF(lc.answers ->> 'certifications', ''),
            NULLIF(lc.answers ->> 'certificate', '')
          ) AS certifications,
          COALESCE(
            NULLIF(lc.answers ->> 'cv_url', ''),
            NULLIF(lc.answers ->> 'cv', ''),
            NULLIF(lc.answers ->> 'resume_url', ''),
            NULLIF(lc.answers ->> 'resume', ''),
            NULLIF(lc.answers #>> '{cv,url}', ''),
            NULLIF(lc.answers #>> '{resume,url}', '')
          ) AS cv_url,
          COALESCE(
            NULLIF(lc.answers ->> 'cv_file_name', ''),
            NULLIF(lc.answers ->> 'cv_name', ''),
            NULLIF(lc.answers ->> 'resume_file_name', ''),
            NULLIF(lc.answers #>> '{cv,name}', ''),
            NULLIF(lc.answers #>> '{resume,name}', '')
          ) AS cv_file_name,
          lc.application_submitted_at AS cv_updated_at
        `,
        sortPrefix: "sp",
    },
    featuredFilterColumn: "sp.featured",
};
// Handles 'listPublicProgramsService' workflow for this module.
export function listPublicProgramsService(query: QueryParams) {
    return listPublicResource(query, programsConfig);
}
// Handles 'listPublicCohortsService' workflow for this module.
export function listPublicCohortsService(query: QueryParams) {
    return listPublicResource(query, cohortsConfig);
}
// Handles 'getPublicCohortDetailService' workflow for this module.
export async function getPublicCohortDetailService(cohortId: number) {
    const normalizedId = Number(cohortId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        throw new AppError(400, "VALIDATION_ERROR", "Cohort id is required.");
    }
    const cohortResult = await withDbRetry(() => getPublicCohortById(normalizedId));
    if (!cohortResult.rowCount) {
        throw new AppError(404, "NOT_FOUND", "Cohort not found.");
    }
    const [instructorsResult, studentsResult] = await Promise.all([
        withDbRetry(() => listPublicCohortInstructors(normalizedId)),
        withDbRetry(() => listPublicCohortStudents(normalizedId)),
    ]);
    return {
        ...cohortResult.rows[0],
        instructors: instructorsResult.rows,
        students: studentsResult.rows,
    };
}
// Handles 'getPublicCohortApplicationFormService' workflow for this module.
export async function getPublicCohortApplicationFormService(cohortId: number) {
    const data = await getCohortFormService(cohortId);
    return {
        cohort: data.cohort,
        resolved_form: data.resolved_form,
        form_source: data.cohort?.use_general_form || !data.custom_form ? "general" : "custom",
    };
}
// Handles 'getPublicProgramApplicationFormService' workflow for this module.
export async function getPublicProgramApplicationFormService(programId: number) {
    const normalizedId = Number(programId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        throw new AppError(400, "VALIDATION_ERROR", "Program id is required.");
    }
    const programResult = await withDbRetry(() => getPublishedProgramById(normalizedId));
    if (!programResult.rowCount) {
        throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found.");
    }
    const data = await getProgramFormService(normalizedId);
    return {
        program: data.program,
        resolved_form: data.resolved_form,
        form_source: data.program?.use_general_form || !data.custom_form ? "general" : "custom",
    };
}
// Handles 'listPublicEventsService' workflow for this module.
export function listPublicEventsService(query: QueryParams) {
    return listPublicResource(query, eventsConfig);
}
// Handles 'getPublicEventBySlugService' workflow for this module.
export async function getPublicEventBySlugService(slug: string) {
    const normalizedSlug = String(slug || "").trim();
    if (!normalizedSlug) {
        throw new AppError(400, "VALIDATION_ERROR", "Event slug is required.");
    }
    const result = await withDbRetry(() => getPublicEventBySlug(normalizedSlug));
    if (!result.rowCount) {
        throw new AppError(404, "NOT_FOUND", "Event not found.");
    }
    return result.rows[0];
}
// Handles 'listPublicAnnouncementsService' workflow for this module.
export function listPublicAnnouncementsService(query: QueryParams) {
    return listPublicResource(query, announcementsConfig);
}
// Handles 'listPublicManagersService' workflow for this module.
export function listPublicManagersService(query: QueryParams) {
    return listPublicResource(query, managersConfig);
}
// Handles 'listPublicInstructorsService' workflow for this module.
export function listPublicInstructorsService(query: QueryParams) {
    return listPublicResource(query, instructorsConfig);
}
// Handles 'listPublicStudentsService' workflow for this module.
export function listPublicStudentsService(query: QueryParams) {
    return listPublicResource(query, studentsConfig);
}
// Handles 'getPublicStudentDetailService' workflow for this module.
export async function getPublicStudentDetailService(publicSlug: string) {
    const profileResult = await getPublicStudentBySlug(publicSlug);
    if (!profileResult.rowCount) {
        throw new AppError(404, "NOT_FOUND", "Student profile not found.");
    }
    const profile = profileResult.rows[0];
    const studentUserId = Number(profile.user_id);
    const projectsResult = Number.isInteger(studentUserId) && studentUserId > 0
        ? await listPublicProjectsByStudentUserId(studentUserId)
        : { rows: [] };
    return {
        ...profile,
        projects: projectsResult.rows,
    };
}
// Handles 'getPublicThemeService' workflow for this module.
export async function getPublicThemeService() {
    const cacheKey = "public:theme";
    const lastKnownGoodCacheKey = "public:theme:last_known_good";
    const cached = await cacheGetJson(cacheKey);
    if (cached !== null) {
        return cached;
    }
    try {
        const result = await withDbRetry(() => listPublicThemeTokens());
        const data = result.rows;
        await cacheSetJson(cacheKey, data, 600);
        await cacheSetJson(lastKnownGoodCacheKey, data, 86400);
        return data;
    }
    catch (error: any) {
        if (!isTransientDatabaseError(error)) {
            throw error;
        }
        const lastKnownGood = await cacheGetJson(lastKnownGoodCacheKey);
        if (lastKnownGood !== null) {
            return lastKnownGood;
        }
        return [];
    }
}
// Handles 'getPublicHomeService' workflow for this module.
export async function getPublicHomeService() {
    const cacheKey = "public:home";
    const lastKnownGoodCacheKey = "public:home:last_known_good";
    const cached = await cacheGetJson(cacheKey);
    if (cached !== null) {
        return cached;
    }
    try {
        await withDbRetry(() => ensureDefaultHomeSections());
        const [sectionsResult, settingsResult] = await Promise.all([
            withDbRetry(() => listPublicHomeSections()),
            withDbRetry(() => getPublicSiteSettings()),
        ]);
        const data = {
            sections: sectionsResult.rows,
            site_settings: settingsResult.rowCount ? settingsResult.rows[0] : null,
        };
        await cacheSetJson(cacheKey, data, 60);
        await cacheSetJson(lastKnownGoodCacheKey, data, 86400);
        return data;
    }
    catch (error: any) {
        if (!isTransientDatabaseError(error)) {
            throw error;
        }
        const lastKnownGood = await cacheGetJson(lastKnownGoodCacheKey);
        if (lastKnownGood !== null) {
            return lastKnownGood;
        }
        return { sections: [], site_settings: null };
    }
}

// Handles 'getPublicPageByKeyService' workflow for this module.
export async function getPublicPageByKeyService(pageKey: string) {
    const normalized = String(pageKey || "").trim().toLowerCase();
    if (!normalized) {
        throw new AppError(400, "VALIDATION_ERROR", "Page key is required.");
    }
    const cacheKey = `public:page:${normalized}`;
    const cached = await cacheGetJson(cacheKey);
    if (cached !== null) {
        return cached;
    }
    let result = await withDbRetry(() => getPublicPageByKey(normalized));
    if (!result.rowCount) {
        await withDbRetry(() => ensureDefaultPages());
        result = await withDbRetry(() => getPublicPageByKey(normalized));
    }
    if (!result.rowCount) {
        throw new AppError(404, "NOT_FOUND", "Page not found.");
    }
    const data = result.rows[0];
    await cacheSetJson(cacheKey, data, 60);
    return data;
}

// Handles 'getPublicApplyFormService' workflow for this module.
export async function getPublicApplyFormService() {
    return withTransaction(async (client: DbClient) => {
        const formResult = await getGeneralApplyForm(client);
        if (!formResult.rowCount) {
            throw new AppError(404, "FORM_NOT_FOUND", "General apply form is not configured.");
        }

        const form = formResult.rows[0];
        const [fieldsResult, programsResult] = await Promise.all([
            listEnabledFormFieldsByFormId(form.id, client),
            listPublishedProgramOptions(client),
        ]);

        const programOptions = programsResult.rows.map((row) => ({
            id: Number(row.id),
            title: row.title,
            slug: row.slug,
        }));

        const fields = fieldsResult.rows.map((field) => {
            if (field.name !== "program_id" || field.type !== "select") {
                return field;
            }

            const hasOptions = Array.isArray(field.options) && field.options.length > 0;
            if (hasOptions) return field;

            return {
                ...field,
                options: programOptions.map((program) => ({
                    label: program.title,
                    value: String(program.id),
                })),
            };
        });

        return {
            form: {
                id: Number(form.id),
                key: form.key,
                title: form.title,
                description: form.description,
                is_active: Boolean(form.is_active),
                updated_at: form.updated_at,
            },
            fields,
            programs: programOptions,
        };
    });
}
// Handles 'getPublicGeneralFormService' workflow for this module.
export async function getPublicGeneralFormService() {
    const data = await getPublicApplyFormService();
    return {
        ...data.form,
        fields: data.fields,
    };
}

// Handles 'normalizeEmail' workflow for this module.
function normalizeEmail(value: unknown) {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed || null;
}
// Handles 'normalizePhone' workflow for this module.
function normalizePhone(value: unknown) {
    if (typeof value !== "string")
        return null;
    const digits = value.replace(/\D/g, "");
    return digits || null;
}
// Handles 'isMissingRequiredAnswer' workflow for this module.
function isMissingRequiredAnswer(value: unknown) {
    if (value === undefined || value === null)
        return true;
    if (typeof value === "string")
        return value.trim() === "";
    if (Array.isArray(value))
        return value.length === 0;
    return false;
}
// Handles 'pickAnswer' workflow for this module.
function pickAnswer(answers: AnyRecord, keys: string[]) {
    for (const key of keys) {
        if (answers[key] !== undefined && answers[key] !== null) {
            return answers[key];
        }
    }
    return null;
}
// Handles 'submitPublicApplyService' workflow for this module.
export async function submitPublicApplyService(payload: AnyRecord) {
    const formResolution = await getPublicProgramApplicationFormService(Number(payload.program_id));
    const resolvedForm = formResolution.resolved_form;
    const resolvedFields = Array.isArray(resolvedForm?.fields)
        ? resolvedForm.fields.filter((field: AnyRecord) => field?.is_enabled !== false)
        : [];
    return withTransaction(async (client: DbClient) => {
        const tableReady = await programApplicationsTableExists(client);
        if (!tableReady) {
            throw new AppError(500, "INTERNAL_ERROR", "program_applications table is missing. Run the required migration before using public apply.");
        }
        const programResult = await getPublishedProgramById(payload.program_id, client);
        if (!programResult.rowCount) {
            throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found.");
        }
        const answers: AnyRecord = payload.answers ?? {};
        const requiredFields = resolvedFields.filter((field: AnyRecord) => field.required);
        const fieldErrors: Record<string, string> = {};
        for (const field of requiredFields) {
          const fieldName = String(field.name || "");
          if (fieldName === "program_id") {
            if (!payload.program_id) {
              fieldErrors[fieldName] = `${field.label || field.name} is required`;
            }
            continue;
          }

          if (isMissingRequiredAnswer(answers[fieldName])) {
            fieldErrors[fieldName] = `${field.label || field.name} is required`;
          }
        }
        if (Object.keys(fieldErrors).length) {
            throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", { fieldErrors });
        }
        const fullNameRaw = pickAnswer(answers, ["full_name", "name"]);
        const emailRaw = pickAnswer(answers, ["email", "applicant_email"]);
        const phoneRaw = pickAnswer(answers, ["phone", "applicant_phone"]);
        const fullName = typeof fullNameRaw === "string" ? fullNameRaw.trim() : null;
        const email = typeof emailRaw === "string" ? emailRaw.trim() : null;
        const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : null;
        const emailNorm = normalizeEmail(email);
        const phoneNorm = normalizePhone(phone);
        if (!emailNorm && !phoneNorm) {
            throw new AppError(400, "VALIDATION_ERROR", "At least one of email or phone is required.");
        }
        let applicantResult = emailNorm
            ? await findApplicantByEmailNorm(emailNorm, client)
            : await findApplicantByPhoneNorm(phoneNorm, client);
        if (!applicantResult.rowCount && phoneNorm) {
            applicantResult = await findApplicantByPhoneNorm(phoneNorm, client);
        }
        if (!applicantResult.rowCount) {
            applicantResult = await createApplicantForPublicApply(fullName, emailNorm, phone, client);
        }
        const applicant = applicantResult.rows[0];
        let applicationResult;
        try {
            if (emailNorm) {
                applicationResult = await upsertProgramApplication({
                    program_id: payload.program_id,
                    applicant_id: applicant.id,
                    applicant_email_norm: emailNorm,
                    applicant_phone_norm: phoneNorm,
                    submission_answers: answers,
                }, client);
            }
            else {
                applicationResult = await upsertProgramApplicationByPhone({
                    program_id: payload.program_id,
                    applicant_id: applicant.id,
                    applicant_email_norm: emailNorm,
                    applicant_phone_norm: phoneNorm,
                    submission_answers: answers,
                }, client);
            }
        }
        catch (error: any) {
            if (error?.code === "23505" && phoneNorm) {
                applicationResult = await upsertProgramApplicationByPhone({
                    program_id: payload.program_id,
                    applicant_id: applicant.id,
                    applicant_email_norm: emailNorm,
                    applicant_phone_norm: phoneNorm,
                    submission_answers: answers,
                }, client);
            }
            else {
                throw error;
            }
        }
        const row = applicationResult.rows[0];
        await logAdminAction({
            actorUserId: null,
            action: ADMIN_ACTIONS.GENERAL_APPLY_SUBMITTED,
            entityType: "program_applications",
            entityId: Number(row.id),
            message: `Public general apply submitted for program ${payload.program_id}.`,
            metadata: {
                program_id: payload.program_id,
                applicant_id: applicant.id ?? null,
                form_id: resolvedForm.id,
            },
            title: "New General Apply Submission",
            body: `A new program application was submitted for '${programResult.rows[0].title}'.`,
        }, client);
        return {
            id: Number(row.id),
            status: row.stage ?? "applied",
        };
    });
}

// Handles 'submitPublicCohortApplyService' workflow for this module.
export async function submitPublicCohortApplyService(cohortId: number, payload: AnyRecord) {
    const normalizedCohortId = Number(cohortId);
    if (!Number.isInteger(normalizedCohortId) || normalizedCohortId <= 0) {
        throw new AppError(400, "VALIDATION_ERROR", "Cohort id is required.");
    }
    const resolution = await getPublicCohortApplicationFormService(normalizedCohortId);
    const answers: AnyRecord = payload?.answers ?? {};
    const fullNameRaw = pickAnswer(answers, ["full_name", "name"]);
    const emailRaw = pickAnswer(answers, ["email", "applicant_email"]);
    const phoneRaw = pickAnswer(answers, ["phone", "applicant_phone"]);
    const applicant = {
        full_name: typeof fullNameRaw === "string" ? fullNameRaw.trim() || undefined : undefined,
        email: typeof emailRaw === "string" ? emailRaw.trim() || undefined : undefined,
        phone: typeof phoneRaw === "string" ? phoneRaw.trim() || undefined : undefined,
    };
    if (!applicant.email && !applicant.phone) {
        throw new AppError(400, "VALIDATION_ERROR", "At least one of email or phone is required.");
    }
    return createApplicationService({
        cohort_id: normalizedCohortId,
        applicant,
        form_id: resolution.resolved_form.id,
        answers,
    });
}

