import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type DbPool = typeof pool;
type Db = DbClient | DbPool;

export async function upsertSubscriber(
  phone: string,
  name: string | null,
  preferences: string[],
  source: string,
  db: Db = pool,
) {
  return db.query(
    `INSERT INTO subscribers (phone, name, preferences, source, is_active, opted_out_at)
     VALUES ($1, $2, $3, $4, TRUE, NULL)
     ON CONFLICT (phone) DO UPDATE
       SET name         = COALESCE(EXCLUDED.name, subscribers.name),
           preferences  = EXCLUDED.preferences,
           is_active    = TRUE,
           opted_out_at = NULL,
           updated_at   = NOW()
     RETURNING *`,
    [phone, name, preferences, source],
  );
}

export async function optOutSubscriber(phone: string, db: Db = pool) {
  return db.query(
    `UPDATE subscribers
     SET is_active = FALSE, opted_out_at = NOW(), updated_at = NOW()
     WHERE phone = $1
     RETURNING *`,
    [phone],
  );
}

export async function countSubscribers(whereClause: string, params: unknown[], db: Db = pool) {
  return db.query(
    `SELECT COUNT(*)::int AS total FROM subscribers s ${whereClause}`,
    params,
  );
}

export async function listSubscribers(
  whereClause: string,
  sortBy: string,
  order: string,
  params: unknown[],
  limit: number,
  offset: number,
  db: Db = pool,
) {
  return db.query(
    `SELECT * FROM subscribers s ${whereClause}
     ORDER BY s.${sortBy} ${order}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
}

export async function getSubscriberById(id: number, db: Db = pool) {
  return db.query(`SELECT * FROM subscribers WHERE id = $1`, [id]);
}

export async function updateSubscriberById(
  id: number,
  fields: { name?: string | null; preferences?: string[]; is_active?: boolean },
  db: Db = pool,
) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined) { values.push(fields.name); sets.push(`name = $${values.length}`); }
  if (fields.preferences !== undefined) { values.push(fields.preferences); sets.push(`preferences = $${values.length}`); }
  if (fields.is_active !== undefined) { values.push(fields.is_active); sets.push(`is_active = $${values.length}`); }
  sets.push(`updated_at = NOW()`);
  values.push(id);
  return db.query(
    `UPDATE subscribers SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values,
  );
}

/**
 * Fetch active subscribers whose preferences overlap with the given topics.
 * A subscriber with preferences containing 'all' is always included.
 * Returns only subscribers who have NOT already received this announcement
 * (deduplication via subscriber_messages).
 */
export async function listSubscribersForBroadcast(
  topics: string[],
  announcementId: number,
  db: Db = pool,
) {
  return db.query(
    `SELECT s.*
     FROM subscribers s
     WHERE s.is_active = TRUE
       AND (
         s.preferences && $1::text[]
         OR 'all' = ANY(s.preferences)
       )
       AND NOT EXISTS (
         SELECT 1 FROM subscriber_messages sm
         WHERE sm.subscriber_id = s.id
           AND sm.announcement_id = $2
       )`,
    [topics, announcementId],
  );
}

export async function recordSubscriberMessages(
  subscriberIds: number[],
  announcementId: number,
  db: Db = pool,
) {
  if (!subscriberIds.length) return;
  const values = subscriberIds
    .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
    .join(", ");
  const params = subscriberIds.flatMap((sid) => [sid, announcementId]);
  return db.query(
    `INSERT INTO subscriber_messages (subscriber_id, announcement_id)
     VALUES ${values}
     ON CONFLICT DO NOTHING`,
    params,
  );
}

/** Preview count only - used by GET /announcements/:id/broadcast/preview */
export async function countSubscribersForBroadcast(
  topics: string[],
  announcementId: number,
  db: Db = pool,
) {
  return db.query(
    `SELECT COUNT(*)::int AS total
     FROM subscribers s
     WHERE s.is_active = TRUE
       AND (
         s.preferences && $1::text[]
         OR 'all' = ANY(s.preferences)
       )
       AND NOT EXISTS (
         SELECT 1 FROM subscriber_messages sm
         WHERE sm.subscriber_id = s.id
           AND sm.announcement_id = $2
       )`,
    [topics, announcementId],
  );
}
