// File Summary: server/src/repositories/public.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function countPublicResources(tableExpression, whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM ${tableExpression} ${whereClause}`, params);
}
export async function listPublicResources(config, whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT ${config.selectFields}
      FROM ${config.tableExpression}
      ${whereClause}
      ORDER BY ${config.sortPrefix}.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function listPublicThemeTokens(db = pool) {
    return db.query(`
      SELECT id, key, purpose, value, scope, updated_at
      FROM theme_tokens
      WHERE scope IN ('global', 'web')
      ORDER BY id ASC
    `);
}
export async function listPublicHomeSections(db = pool) {
    return db.query(`
      SELECT id, key, title, is_enabled, sort_order, content, updated_at
      FROM home_sections
      WHERE is_enabled = TRUE
      ORDER BY sort_order ASC, id ASC
    `);
}
export async function getPublicSiteSettings(db = pool) {
    return db.query(`
      SELECT id, site_name, default_event_location, contact_info, social_links, updated_at
      FROM site_settings
      WHERE id = 1
    `);
}
export async function getPublicStudentBySlug(publicSlug, db = pool) {
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
        sp.company_work_for
      FROM student_profiles sp
      WHERE sp.is_public = TRUE
        AND sp.public_slug = $1
      LIMIT 1
    `, [publicSlug]);
}

export async function programApplicationsTableExists(db = pool) {
    const result = await db.query(`
      SELECT to_regclass('public.program_applications') IS NOT NULL AS exists
    `);
    return Boolean(result.rows[0]?.exists);
}

export async function getGeneralApplyForm(db = pool) {
    return db.query(`
      SELECT id, key, title, description, is_active
      FROM forms
      WHERE key IN ('general_apply', 'cohort_application')
        AND is_active = TRUE
      ORDER BY CASE key WHEN 'general_apply' THEN 0 ELSE 1 END, id ASC
      LIMIT 1
    `);
}

export async function listEnabledFormFieldsByFormId(formId, db = pool) {
    return db.query(`
      SELECT id, form_id, name, label, type, required, options, placeholder, sort_order, is_enabled
      FROM form_fields
      WHERE form_id = $1
        AND is_enabled = TRUE
      ORDER BY sort_order ASC, id ASC
    `, [formId]);
}

export async function getPublishedProgramById(programId, db = pool) {
    return db.query(`
      SELECT id, title
      FROM programs
      WHERE id = $1
        AND is_published = TRUE
        AND deleted_at IS NULL
      LIMIT 1
    `, [programId]);
}

export async function findApplicantByEmailNorm(emailNorm, db = pool) {
    return db.query(`
      SELECT id, full_name, email, phone
      FROM applicants
      WHERE lower(email) = $1
      ORDER BY id DESC
      LIMIT 1
    `, [emailNorm]);
}

export async function findApplicantByPhoneNorm(phoneNorm, db = pool) {
    return db.query(`
      SELECT id, full_name, email, phone
      FROM applicants
      WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $1
      ORDER BY id DESC
      LIMIT 1
    `, [phoneNorm]);
}

export async function createApplicantForPublicApply(fullName, email, phone, db = pool) {
    return db.query(`
      INSERT INTO applicants (full_name, email, phone, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, full_name, email, phone
    `, [fullName, email, phone]);
}

export async function upsertProgramApplication(input, db = pool) {
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

export async function upsertProgramApplicationByPhone(input, db = pool) {
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


