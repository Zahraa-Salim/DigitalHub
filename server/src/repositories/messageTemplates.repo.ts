// File: server/src/repositories/messageTemplates.repo.ts
// Purpose: Runs the database queries used for message templates.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type MessageTemplateInput = {
  key: string;
  label: string;
  description?: string | null;
  channel?: string;
  subject?: string | null;
  body: string;
  is_active?: boolean;
  sort_order?: number;
  created_by?: number | null;
};

// Handles 'ensureMessageTemplatesTable' workflow for this module.
export async function ensureMessageTemplatesTable(db: DbClient = pool) {
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

// Handles 'insertDefaultMessageTemplate' workflow for this module.
export async function insertDefaultMessageTemplate(input: MessageTemplateInput, db: DbClient = pool) {
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

// Handles 'countMessageTemplates' workflow for this module.
export async function countMessageTemplates(includeInactive = false, db: DbClient = pool) {
  return db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM message_templates
      ${includeInactive ? "" : "WHERE is_active = TRUE"}
    `,
  );
}

// Handles 'listMessageTemplates' workflow for this module.
export async function listMessageTemplates(includeInactive = false, sortBy = "sort_order", order = "asc", limit = 10, offset = 0, db: DbClient = pool) {
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
      ORDER BY ${sortBy} ${order}, key ASC
      LIMIT $1
      OFFSET $2
    `,
    [limit, offset],
  );
}

// Handles 'createMessageTemplate' workflow for this module.
export async function createMessageTemplate(input: MessageTemplateInput, db: DbClient = pool) {
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

// Handles 'getMessageTemplateByKey' workflow for this module.
export async function getMessageTemplateByKey(key: string, db: DbClient = pool) {
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

// Handles 'updateMessageTemplateByKey' workflow for this module.
export async function updateMessageTemplateByKey(
  key: string,
  setClause: string,
  values: unknown[],
  updatedBy: number | null | undefined,
  db: DbClient = pool,
) {
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

// Handles 'setMessageTemplateActiveByKey' workflow for this module.
export async function setMessageTemplateActiveByKey(key: string, isActive: boolean, db: DbClient = pool) {
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

