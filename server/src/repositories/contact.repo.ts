// File: server/src/repositories/contact.repo.ts
// Purpose: Runs the database queries used for contact.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type ContactMessageInput = {
    name: string;
    email: string;
    phone?: string | null;
    subject?: string | null;
    message: string;
    kind?: string | null;
    company_name?: string | null;
    company_role?: string | null;
    linkedin_url?: string | null;
    visit_preferred_dates?: string | null;
    visit_notes?: string | null;
};
// Handles 'createContactMessage' workflow for this module.
export async function createContactMessage(input: ContactMessageInput, db: DbClient = pool) {
    return db.query(`
      INSERT INTO contact_messages
        (name, email, phone, subject, message, kind, company_name, company_role, linkedin_url, visit_preferred_dates, visit_notes, status, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'new', NOW())
      RETURNING *
    `, [
        input.name,
        input.email,
        input.phone ?? null,
        input.subject ?? null,
        input.message,
        input.kind,
        input.company_name ?? null,
        input.company_role ?? null,
        input.linkedin_url ?? null,
        input.visit_preferred_dates ?? null,
        input.visit_notes ?? null,
    ]);
}
// Handles 'countContactMessages' workflow for this module.
export async function countContactMessages(whereClause: string, params: unknown[], db: DbClient = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM contact_messages ${whereClause}`, params);
}
// Handles 'listContactMessages' workflow for this module.
export async function listContactMessages(
    whereClause: string,
    sortBy: string,
    order: string,
    params: unknown[],
    limit: number,
    offset: number,
    db: DbClient = pool,
) {
    return db.query(`
      SELECT *
      FROM contact_messages
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'updateContactStatus' workflow for this module.
export async function updateContactStatus(id: number, status: string, resolvedAtClause: string, db: DbClient = pool) {
    return db.query(`
      UPDATE contact_messages
      SET status = $1, resolved_at = ${resolvedAtClause}
      WHERE id = $2
      RETURNING *
    `, [status, id]);
}
// Handles 'markContactReplied' workflow for this module.
export async function markContactReplied(id: number, db: DbClient = pool) {
    return db.query(`
      UPDATE contact_messages
      SET last_replied_at = NOW(), status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END
      WHERE id = $1
      RETURNING *
    `, [id]);
}
// Handles 'getContactMessageById' workflow for this module.
export async function getContactMessageById(id: number, db: DbClient = pool) {
    return db.query(`
      SELECT *
      FROM contact_messages
      WHERE id = $1
      LIMIT 1
    `, [id]);
}

