import { withTransaction } from "../db/index.js";
import type { DbClient } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause } from "../utils/sql.js";
import { normalizePhone } from "../utils/normalize.js";
import {
  countSubscribers,
  getSubscriberById,
  listSubscribers,
  optOutSubscriber,
  updateSubscriberById,
  upsertSubscriber,
} from "../repositories/subscribers.repo.js";

const VALID_PREFERENCES = ["open_programs", "upcoming_programs", "upcoming_events", "announcements", "all"] as const;
type PreferenceKey = typeof VALID_PREFERENCES[number];

const ALLOWED_SORT = ["created_at", "updated_at", "phone", "name"] as const;

function validatePreferences(raw: unknown[]): PreferenceKey[] {
  const valid = raw.filter((p) => VALID_PREFERENCES.includes(p as PreferenceKey)) as PreferenceKey[];
  if (!valid.length) throw new AppError(400, "VALIDATION_ERROR", "At least one valid preference is required.");
  return valid;
}

export async function subscribeService(payload: {
  phone: string;
  name?: string | null;
  preferences: unknown[];
  source?: string;
}) {
  const phone = normalizePhone(payload.phone);
  if (!phone) throw new AppError(400, "VALIDATION_ERROR", "A valid phone number is required.");
  const preferences = validatePreferences(Array.isArray(payload.preferences) ? payload.preferences : []);
  const result = await upsertSubscriber(phone, payload.name ?? null, preferences, payload.source ?? "website");
  return result.rows[0];
}

export async function unsubscribeService(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new AppError(400, "VALIDATION_ERROR", "A valid phone number is required.");
  const result = await optOutSubscriber(normalized);
  return { success: true, opted_out: Boolean(result.rowCount) };
}

export async function listSubscribersService(query: Record<string, unknown>) {
  const list = parseListQuery(query, [...ALLOWED_SORT], "created_at");
  const sortBy = ALLOWED_SORT.includes(list.sortBy as typeof ALLOWED_SORT[number]) ? list.sortBy : "created_at";
  const params: unknown[] = [];
  const where: string[] = [];

  if (list.search) {
    params.push(`%${list.search}%`);
    where.push(buildSearchClause(["COALESCE(s.phone, '')", "COALESCE(s.name, '')"], params.length));
  }
  if (query.preference) {
    params.push(query.preference as string);
    where.push(`$${params.length} = ANY(s.preferences)`);
  }
  if (query.active !== undefined) {
    params.push(query.active === "true" || query.active === true);
    where.push(`s.is_active = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await countSubscribers(whereClause, params);
  const total = Number(countResult.rows[0]?.total ?? 0);
  const dataResult = await listSubscribers(whereClause, sortBy, list.order, params, list.limit, list.offset);

  return {
    data: dataResult.rows,
    pagination: buildPagination(list.page, list.limit, total),
  };
}

export async function patchSubscriberService(
  id: number,
  adminId: number,
  payload: { name?: string | null; preferences?: unknown[]; is_active?: boolean },
) {
  return withTransaction(async (client: DbClient) => {
    const existing = await getSubscriberById(id, client);
    if (!existing.rowCount) throw new AppError(404, "NOT_FOUND", "Subscriber not found.");

    const update: Parameters<typeof updateSubscriberById>[1] = {};
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.preferences !== undefined) {
      update.preferences = validatePreferences(Array.isArray(payload.preferences) ? payload.preferences : []);
    }
    if (payload.is_active !== undefined) update.is_active = payload.is_active;

    const result = await updateSubscriberById(id, update, client);
    await logAdminAction({
      actorUserId: adminId,
      action: "patch subscriber",
      entityType: "subscribers",
      entityId: id,
      message: `Subscriber ${id} updated.`,
      metadata: { updated_fields: Object.keys(update) },
      title: "Subscriber Updated",
      body: `Subscriber #${id} was updated.`,
    }, client);
    return result.rows[0];
  });
}
