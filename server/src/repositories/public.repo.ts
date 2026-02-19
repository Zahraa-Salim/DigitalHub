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


