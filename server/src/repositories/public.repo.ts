// File: server/src/repositories/public.repo.ts
// Purpose: Runs the database queries used for public.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type PublicListConfig = {
    selectFields: string;
    tableExpression: string;
    sortPrefix: string;
};

type ProgramApplicationUpsertInput = {
    program_id: number;
    applicant_id?: number | null;
    applicant_email_norm?: string | null;
    applicant_phone_norm?: string | null;
    submission_answers?: unknown;
};
// Handles 'countPublicResources' workflow for this module.
export async function countPublicResources(
    tableExpression: string,
    whereClause: string,
    params: unknown[],
    db: DbClient = pool,
) {
    return db.query(`SELECT COUNT(*)::int AS total FROM ${tableExpression} ${whereClause}`, params);
}
// Handles 'listPublicResources' workflow for this module.
export async function listPublicResources(
    config: PublicListConfig,
    whereClause: string,
    sortBy: string,
    order: string,
    params: unknown[],
    limit: number,
    offset: number,
    db: DbClient = pool,
) {
    return db.query(`
      SELECT ${config.selectFields}
      FROM ${config.tableExpression}
      ${whereClause}
      ORDER BY ${config.sortPrefix}.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'listPublicThemeTokens' workflow for this module.
export async function listPublicThemeTokens(db: DbClient = pool) {
    return db.query(`
      SELECT id, key, purpose, value, scope, updated_at
      FROM theme_tokens
      WHERE scope IN ('global', 'web')
      ORDER BY id ASC
    `);
}
// Handles 'listPublicHomeSections' workflow for this module.
export async function listPublicHomeSections(db: DbClient = pool) {
    return db.query(`
      SELECT id, key, title, is_enabled, sort_order, content, updated_at
      FROM home_sections
      ORDER BY sort_order ASC, id ASC
    `);
}
// Handles 'getPublicPageByKey' workflow for this module.
export async function getPublicPageByKey(pageKey: string, db: DbClient = pool) {
    return db.query(`
      SELECT id, key, title, content, is_published, updated_at
      FROM pages
      WHERE key = $1
        AND is_published = TRUE
      LIMIT 1
    `, [pageKey]);
}
// Handles 'getPublicSiteSettings' workflow for this module.
export async function getPublicSiteSettings(db: DbClient = pool) {
    return db.query(`
      SELECT id, site_name, default_event_location, contact_info, social_links, updated_at
      FROM site_settings
      WHERE id = 1
    `);
}
// Handles 'getPublicStudentBySlug' workflow for this module.
export async function getPublicStudentBySlug(publicSlug: string, db: DbClient = pool) {
    return db.query(`
      SELECT
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
      FROM student_profiles sp
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
      WHERE sp.is_public = TRUE
        AND COALESCE(sp.admin_status, 'active') = 'active'
        AND sp.public_slug = $1
      LIMIT 1
    `, [publicSlug]);
}

// Handles 'getPublicEventBySlug' workflow for this module.
export async function getPublicEventBySlug(slug: string, db: DbClient = pool) {
    return db.query(`
      SELECT e.id, e.slug, e.title, e.description, e.post_body, e.location, e.starts_at, e.ends_at, e.is_done, e.done_at, e.completion_image_urls, e.created_at, e.updated_at
      FROM events e
      WHERE e.is_published = TRUE
        AND e.deleted_at IS NULL
        AND e.slug = $1
      LIMIT 1
    `, [slug]);
}

// Handles 'getPublicCohortById' workflow for this module.
export async function getPublicCohortById(cohortId: number, db: DbClient = pool) {
    return db.query(`
      SELECT
        c.id,
        c.program_id,
        p.title AS program_title,
        p.image_url AS program_image_url,
        p.summary AS program_summary,
        p.description AS program_description,
        p.requirements AS program_requirements,
        c.name,
        CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS status,
        CASE WHEN c.status = 'open' THEN TRUE ELSE FALSE END AS allow_applications,
        c.use_general_form,
        c.application_form_id,
        c.enrollment_open_at,
        c.enrollment_close_at,
        c.start_date,
        c.end_date,
        c.attendance_days,
        c.attendance_start_time,
        c.attendance_end_time,
        c.created_at,
        c.updated_at
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = $1
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND p.is_published = TRUE
      LIMIT 1
    `, [cohortId]);
}

// Handles 'listPublicCohortInstructors' workflow for this module.
export async function listPublicCohortInstructors(cohortId: number, db: DbClient = pool) {
    return db.query(`
      SELECT
        ip.user_id,
        ip.full_name,
        ip.avatar_url,
        ip.bio,
        ip.expertise,
        ip.skills,
        ip.linkedin_url,
        ip.github_url,
        ip.portfolio_url,
        ci.cohort_role
      FROM cohort_instructors ci
      JOIN instructor_profiles ip ON ip.user_id = ci.instructor_user_id
      JOIN users u ON u.id = ip.user_id
      WHERE ci.cohort_id = $1
        AND ip.is_public = TRUE
        AND u.is_active = TRUE
      ORDER BY ip.full_name ASC
    `, [cohortId]);
}

// Handles 'listPublicCohortStudents' workflow for this module.
export async function listPublicCohortStudents(cohortId: number, db: DbClient = pool) {
    return db.query(`
      SELECT
        sp.user_id,
        sp.full_name,
        sp.avatar_url,
        sp.bio,
        NULL::text AS skills,
        sp.linkedin_url,
        sp.github_url,
        sp.portfolio_url,
        sp.public_slug,
        e.status AS enrollment_status,
        e.enrolled_at
      FROM enrollments e
      JOIN student_profiles sp ON sp.user_id = e.student_user_id
      JOIN users u ON u.id = sp.user_id
      WHERE e.cohort_id = $1
        AND e.status IN ('active', 'paused', 'completed')
        AND sp.is_public = TRUE
        AND u.is_active = TRUE
      ORDER BY
        CASE e.status
          WHEN 'active' THEN 0
          WHEN 'paused' THEN 1
          WHEN 'completed' THEN 2
          ELSE 3
        END,
        e.enrolled_at DESC,
        sp.full_name ASC
    `, [cohortId]);
}

// Handles 'programApplicationsTableExists' workflow for this module.
export async function programApplicationsTableExists(db: DbClient = pool) {
    const result = await db.query(`
      SELECT to_regclass('public.program_applications') IS NOT NULL AS exists
    `);
    return Boolean(result.rows[0]?.exists);
}

// Handles 'getGeneralApplyForm' workflow for this module.
export async function getGeneralApplyForm(db: DbClient = pool) {
    return db.query(`
      SELECT id, key, title, description, is_active, updated_at
      FROM forms
      WHERE key IN ('program_application', 'general_apply', 'cohort_application')
        AND is_active = TRUE
      ORDER BY
        CASE key
          WHEN 'program_application' THEN 0
          WHEN 'general_apply' THEN 1
          ELSE 2
        END,
        id ASC
      LIMIT 1
    `);
}

// Handles 'listPublishedProgramOptions' workflow for this module.
export async function listPublishedProgramOptions(db: DbClient = pool) {
    return db.query(`
      SELECT id, title, slug
      FROM programs
      WHERE is_published = TRUE
        AND deleted_at IS NULL
      ORDER BY title ASC
    `);
}

// Handles 'listEnabledFormFieldsByFormId' workflow for this module.
export async function listEnabledFormFieldsByFormId(formId: number, db: DbClient = pool) {
    return db.query(`
      SELECT id, form_id, name, label, type, required, options, placeholder, sort_order, is_enabled
      FROM form_fields
      WHERE form_id = $1
        AND is_enabled = TRUE
      ORDER BY sort_order ASC, id ASC
    `, [formId]);
}

// Handles 'getPublishedProgramById' workflow for this module.
export async function getPublishedProgramById(programId: number, db: DbClient = pool) {
    return db.query(`
      SELECT id, title
      FROM programs
      WHERE id = $1
        AND is_published = TRUE
        AND deleted_at IS NULL
      LIMIT 1
    `, [programId]);
}

// Handles 'findApplicantByEmailNorm' workflow for this module.
export async function findApplicantByEmailNorm(emailNorm: string | null, db: DbClient = pool) {
    return db.query(`
      SELECT id, full_name, email, phone
      FROM applicants
      WHERE lower(email) = $1
      ORDER BY id DESC
      LIMIT 1
    `, [emailNorm]);
}

// Handles 'findApplicantByPhoneNorm' workflow for this module.
export async function findApplicantByPhoneNorm(phoneNorm: string | null, db: DbClient = pool) {
    return db.query(`
      SELECT id, full_name, email, phone
      FROM applicants
      WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $1
      ORDER BY id DESC
      LIMIT 1
    `, [phoneNorm]);
}

// Handles 'createApplicantForPublicApply' workflow for this module.
export async function createApplicantForPublicApply(
    fullName: string | null,
    email: string | null,
    phone: string | null,
    db: DbClient = pool,
) {
    return db.query(`
      INSERT INTO applicants (full_name, email, phone, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, full_name, email, phone
    `, [fullName, email, phone]);
}

// Handles 'upsertProgramApplication' workflow for this module.
export async function upsertProgramApplication(input: ProgramApplicationUpsertInput, db: DbClient = pool) {
    return db.query(`
      INSERT INTO program_applications (
        program_id,
        applicant_id,
        applicant_email_norm,
        applicant_phone_norm,
        submission_answers,
        stage,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), 'applied', NOW(), NOW())
      ON CONFLICT (program_id, applicant_email_norm)
        WHERE applicant_email_norm IS NOT NULL
      DO UPDATE SET
        applicant_id = EXCLUDED.applicant_id,
        applicant_phone_norm = EXCLUDED.applicant_phone_norm,
        submission_answers = EXCLUDED.submission_answers,
        stage = 'applied',
        updated_at = NOW()
      RETURNING id, stage
    `, [
      input.program_id,
      input.applicant_id ?? null,
      input.applicant_email_norm ?? null,
      input.applicant_phone_norm ?? null,
      input.submission_answers ?? {},
    ]);
}

// Handles 'upsertProgramApplicationByPhone' workflow for this module.
export async function upsertProgramApplicationByPhone(input: ProgramApplicationUpsertInput, db: DbClient = pool) {
    return db.query(`
      INSERT INTO program_applications (
        program_id,
        applicant_id,
        applicant_email_norm,
        applicant_phone_norm,
        submission_answers,
        stage,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), 'applied', NOW(), NOW())
      ON CONFLICT (program_id, applicant_phone_norm)
        WHERE applicant_phone_norm IS NOT NULL
      DO UPDATE SET
        applicant_id = EXCLUDED.applicant_id,
        applicant_email_norm = EXCLUDED.applicant_email_norm,
        submission_answers = EXCLUDED.submission_answers,
        stage = 'applied',
        updated_at = NOW()
      RETURNING id, stage
    `, [
      input.program_id,
      input.applicant_id ?? null,
      input.applicant_email_norm ?? null,
      input.applicant_phone_norm ?? null,
      input.submission_answers ?? {},
    ]);
}

