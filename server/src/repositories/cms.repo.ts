// File Summary: server/src/repositories/cms.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function getSiteSettings(db = pool) {
    return db.query(`
      SELECT id, site_name, default_event_location, contact_info, social_links, updated_by, updated_at
      FROM site_settings
      WHERE id = 1
    `);
}
export async function ensureSiteSettingsRow(adminId, db = pool) {
    return db.query(`
      INSERT INTO site_settings (id, site_name, default_event_location, contact_info, social_links, updated_by, updated_at)
      VALUES (1, 'Digital Hub', 'Digital Hub', '{}'::jsonb, '{}'::jsonb, $1, NOW())
      ON CONFLICT (id) DO NOTHING
    `, [adminId]);
}
export async function updateSiteSettings(setClause, values, adminId, db = pool) {
    return db.query(`
      UPDATE site_settings
      SET ${setClause}, updated_by = $${values.length + 1}, updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [...values, adminId]);
}
export async function countPages(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM pages ${whereClause}`, params);
}
export async function listPages(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT id, key, title, content, is_published, updated_by, updated_at
      FROM pages
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function updatePage(id, setClause, values, adminId, db = pool) {
    return db.query(`
      UPDATE pages
      SET ${setClause}, updated_by = $${values.length + 1}, updated_at = NOW()
      WHERE id = $${values.length + 2}
      RETURNING *
    `, [...values, adminId, id]);
}
export async function countHomeSections(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM home_sections ${whereClause}`, params);
}
export async function listHomeSections(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT id, key, title, is_enabled, sort_order, content, updated_by, updated_at
      FROM home_sections
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function updateHomeSection(id, setClause, values, adminId, db = pool) {
    return db.query(`
      UPDATE home_sections
      SET ${setClause}, updated_by = $${values.length + 1}, updated_at = NOW()
      WHERE id = $${values.length + 2}
      RETURNING *
    `, [...values, adminId, id]);
}
export async function countThemeTokens(whereClause, params, db = pool) {
    return db.query(`SELECT COUNT(*)::int AS total FROM theme_tokens ${whereClause}`, params);
}
export async function listThemeTokens(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT id, key, purpose, value, scope, updated_by, updated_at
      FROM theme_tokens
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function createThemeToken(key, purpose, value, scope, adminId, db = pool) {
    return db.query(`
      INSERT INTO theme_tokens (key, purpose, value, scope, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [key, purpose, value, scope, adminId]);
}
export async function updateThemeToken(id, setClause, values, adminId, db = pool) {
    return db.query(`
      UPDATE theme_tokens
      SET ${setClause}, updated_by = $${values.length + 1}, updated_at = NOW()
      WHERE id = $${values.length + 2}
      RETURNING *
    `, [...values, adminId, id]);
}


