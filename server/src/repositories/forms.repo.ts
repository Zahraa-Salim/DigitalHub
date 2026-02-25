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
