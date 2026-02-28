// File Summary: server/src/repositories/forms.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";

function toJsonbParam(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    // Accept already-JSON strings and plain strings safely.
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      return JSON.stringify(trimmed);
    }
  }

  return JSON.stringify(value);
}

export async function findFormByKey(key, db = pool) {
  return db.query(
    `
      SELECT id, key, title, description, is_active, created_by, updated_at
      FROM forms
      WHERE key = $1
      LIMIT 1
    `,
    [key],
  );
}

export async function listForms(scope = "all", db = pool) {
  let whereClause = "";
  const params = [];
  if (scope === "general") {
    whereClause = "WHERE f.key NOT LIKE 'cohort_application_cohort_%'";
  } else if (scope === "cohort") {
    whereClause = "WHERE f.key LIKE 'cohort_application_cohort_%'";
  }

  return db.query(
    `
      SELECT
        f.id,
        f.key,
        f.title,
        f.description,
        f.is_active,
        f.created_by,
        f.updated_at,
        (SELECT COUNT(*)::int FROM form_fields ff WHERE ff.form_id = f.id) AS field_count
      FROM forms f
      ${whereClause}
      ORDER BY f.updated_at DESC, f.id DESC
    `,
    params,
  );
}

export async function getFormById(id, db = pool) {
  return db.query(
    `
      SELECT id, key, title, description, is_active, created_by, updated_at
      FROM forms
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );
}

export async function renameFormKey(formId, nextKey, db = pool) {
  return db.query(
    `
      UPDATE forms
      SET key = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, key, title, description, is_active, created_by, updated_at
    `,
    [formId, nextKey],
  );
}

export async function listFormFields(formId, db = pool) {
  return db.query(
    `
      SELECT
        id,
        form_id,
        name,
        label,
        type,
        required,
        options,
        placeholder,
        min_length,
        max_length,
        sort_order,
        is_enabled
      FROM form_fields
      WHERE form_id = $1
      ORDER BY sort_order ASC, id ASC
    `,
    [formId],
  );
}

export async function getFormFieldById(fieldId, db = pool) {
  return db.query(
    `
      SELECT
        id,
        form_id,
        name,
        label,
        type,
        required,
        options,
        placeholder,
        min_length,
        max_length,
        sort_order,
        is_enabled
      FROM form_fields
      WHERE id = $1
      LIMIT 1
    `,
    [fieldId],
  );
}

export async function createForm(input, db = pool) {
  return db.query(
    `
      INSERT INTO forms (key, title, description, is_active, created_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING id, key, title, description, is_active, created_by, updated_at
    `,
    [input.key, input.title ?? null, input.description ?? null, input.is_active ?? true, input.created_by ?? null],
  );
}

export async function updateForm(formId, setClause, values, db = pool) {
  return db.query(
    `
      UPDATE forms
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING id, key, title, description, is_active, created_by, updated_at
    `,
    [...values, formId],
  );
}

export async function replaceFormFields(formId, fields, db = pool) {
  await db.query(`DELETE FROM form_fields WHERE form_id = $1`, [formId]);

  for (const field of fields) {
    await db.query(
      `
        INSERT INTO form_fields
          (form_id, name, label, type, required, options, placeholder, min_length, max_length, sort_order, is_enabled)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        formId,
        field.name,
        field.label,
        field.type,
        field.required ?? false,
        toJsonbParam(field.options),
        field.placeholder ?? null,
        field.min_length ?? null,
        field.max_length ?? null,
        field.sort_order ?? 0,
        field.is_enabled ?? true,
      ],
    );
  }

  return listFormFields(formId, db);
}

export async function createFormField(formId, field, db = pool) {
  return db.query(
    `
      INSERT INTO form_fields
        (form_id, name, label, type, required, options, placeholder, min_length, max_length, sort_order, is_enabled)
      VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          COALESCE(
            $10,
            (
              SELECT COALESCE(MAX(ff.sort_order), -1) + 1
              FROM form_fields ff
              WHERE ff.form_id = $1
            )
          ),
          $11
        )
      RETURNING
        id, form_id, name, label, type, required, options, placeholder, min_length, max_length, sort_order, is_enabled
    `,
    [
      formId,
      field.name,
      field.label,
      field.type,
      field.required ?? false,
      toJsonbParam(field.options),
      field.placeholder ?? null,
      field.min_length ?? null,
      field.max_length ?? null,
      field.sort_order ?? null,
      field.is_enabled ?? true,
    ],
  );
}

export async function updateFormField(fieldId, setClause, values, db = pool) {
  return db.query(
    `
      UPDATE form_fields
      SET ${setClause}
      WHERE id = $${values.length + 1}
      RETURNING
        id, form_id, name, label, type, required, options, placeholder, min_length, max_length, sort_order, is_enabled
    `,
    [...values, fieldId],
  );
}

export async function deleteFormField(fieldId, db = pool) {
  return db.query(
    `
      DELETE FROM form_fields
      WHERE id = $1
      RETURNING id, form_id
    `,
    [fieldId],
  );
}

export async function reorderFormFields(formId, orderedFieldIds, db = pool) {
  return db.query(
    `
      UPDATE form_fields ff
      SET sort_order = src.sort_order
      FROM (
        SELECT
          x.id::bigint AS id,
          x.ord::int - 1 AS sort_order
        FROM UNNEST($2::bigint[]) WITH ORDINALITY AS x(id, ord)
      ) src
      WHERE ff.id = src.id
        AND ff.form_id = $1
      RETURNING ff.id, ff.form_id, ff.sort_order
    `,
    [formId, orderedFieldIds],
  );
}

export async function getCohortFormConfigById(cohortId, db = pool) {
  return db.query(
    `
      SELECT
        c.id,
        c.name,
        c.program_id,
        p.title AS program_title,
        CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS status,
        c.use_general_form,
        c.application_form_id,
        c.updated_at
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = $1
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
      LIMIT 1
    `,
    [cohortId],
  );
}

export async function listCohortFormOptions(db = pool) {
  return db.query(`
      SELECT
        c.id,
        c.name,
        p.title AS program_title,
        CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END AS status,
        c.use_general_form,
        c.application_form_id,
        c.updated_at
      FROM cohorts c
      JOIN programs p ON p.id = c.program_id
      WHERE c.deleted_at IS NULL
        AND p.deleted_at IS NULL
      ORDER BY c.updated_at DESC, c.id DESC
    `);
}

export async function updateCohortFormConfig(cohortId, useGeneralForm, applicationFormId, db = pool) {
  return db.query(
    `
      UPDATE cohorts
      SET use_general_form = $1,
          application_form_id = $2,
          updated_at = NOW()
      WHERE id = $3
        AND deleted_at IS NULL
      RETURNING id, use_general_form, application_form_id, updated_at
    `,
    [useGeneralForm, applicationFormId, cohortId],
  );
}

export async function normalizeLegacyPlannedStatuses(db = pool) {
  return db.query(`
      UPDATE cohorts
      SET status = 'coming_soon', updated_at = NOW()
      WHERE status = 'planned'
        AND deleted_at IS NULL
    `);
}

export async function listPublishedProgramOptions(db = pool) {
  return db.query(
    `
      SELECT id, title
      FROM programs
      WHERE deleted_at IS NULL
        AND is_published = TRUE
      ORDER BY title ASC, id ASC
    `,
  );
}
