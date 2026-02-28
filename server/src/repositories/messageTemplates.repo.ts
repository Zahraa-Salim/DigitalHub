// File Summary: server/src/repositories/messageTemplates.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";

export async function ensureMessageTemplatesTable(db = pool) {
  return db.query(`
    CREATE TABLE IF NOT EXISTS message_templates (
      id          BIGSERIAL PRIMARY KEY,
      key         TEXT NOT NULL UNIQUE,
      label       TEXT NOT NULL,
      description TEXT,
      channel     TEXT NOT NULL DEFAULT 'all'
        CHECK (channel IN ('email', 'sms', 'all')),
      subject     TEXT,
      body        TEXT NOT NULL,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
      updated_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_message_templates_active_order
      ON message_templates (is_active, sort_order);
  `);
}

export async function insertDefaultMessageTemplate(input, db = pool) {
  return db.query(
    `
      INSERT INTO message_templates (
        key,
        label,
        description,
        channel,
        subject,
        body,
        is_active,
        sort_order,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL)
      ON CONFLICT (key) DO UPDATE
      SET
        label = EXCLUDED.label,
        description = EXCLUDED.description,
        channel = EXCLUDED.channel,
        subject = EXCLUDED.subject,
        body = EXCLUDED.body,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
      WHERE message_templates.updated_by IS NULL
    `,
    [
      input.key,
      input.label,
      input.description ?? null,
      input.channel ?? "all",
      input.subject ?? null,
      input.body,
      input.is_active ?? true,
      input.sort_order ?? 0,
    ],
  );
}

export async function listMessageTemplates(includeInactive = false, db = pool) {
  return db.query(
    `
      SELECT
        id,
        key,
        label,
        description,
        channel,
        subject,
        body,
        is_active,
        sort_order,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM message_templates
      ${includeInactive ? "" : "WHERE is_active = TRUE"}
      ORDER BY sort_order ASC, key ASC
    `,
  );
}

export async function createMessageTemplate(input, db = pool) {
  return db.query(
    `
      INSERT INTO message_templates (
        key,
        label,
        description,
        channel,
        subject,
        body,
        is_active,
        sort_order,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING
        id,
        key,
        label,
        description,
        channel,
        subject,
        body,
        is_active,
        sort_order,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [
      input.key,
      input.label,
      input.description ?? null,
      input.channel ?? "all",
      input.subject ?? null,
      input.body,
      input.is_active ?? true,
      input.sort_order ?? 0,
      input.created_by ?? null,
    ],
  );
}

export async function getMessageTemplateByKey(key, db = pool) {
  return db.query(
    `
      SELECT
        id,
        key,
        label,
        description,
        channel,
        subject,
        body,
        is_active,
        sort_order,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM message_templates
      WHERE key = $1
      LIMIT 1
    `,
    [key],
  );
}

export async function updateMessageTemplateByKey(key, setClause, values, updatedBy, db = pool) {
  return db.query(
    `
      UPDATE message_templates
      SET ${setClause},
          updated_by = $${values.length + 1},
          updated_at = NOW()
      WHERE key = $${values.length + 2}
      RETURNING
        id,
        key,
        label,
        description,
        channel,
        subject,
        body,
        is_active,
        sort_order,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [...values, updatedBy ?? null, key],
  );
}

export async function setMessageTemplateActiveByKey(key, isActive, db = pool) {
  return db.query(
    `
      UPDATE message_templates
      SET is_active = $2,
          updated_at = NOW()
      WHERE key = $1
      RETURNING id
    `,
    [key, Boolean(isActive)],
  );
}
