// File Summary: server/src/repositories/contact.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function createContactMessage(input, db = pool) {
    return db.query(`
      INSERT INTO contact_messages
        (name, email, phone, subject, message, kind, company_name, company_role, visit_preferred_dates, visit_notes, status, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'new', NOW())
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
        input.visit_preferred_dates ?? null,
        input.visit_notes ?? null,
    ]);
}
export async function countContactMessages(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM contact_messages ${whereClause}`, params);
}
export async function listContactMessages(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT *
      FROM contact_messages
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function updateContactStatus(id, status, resolvedAtClause, db = pool) {
    return db.query(`
      UPDATE contact_messages
      SET status = $1, resolved_at = ${resolvedAtClause}
      WHERE id = $2
      RETURNING *
    `, [status, id]);
}
export async function markContactReplied(id, db = pool) {
    return db.query(`
      UPDATE contact_messages
      SET last_replied_at = NOW(), status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END
      WHERE id = $1
      RETURNING *
    `, [id]);
}


