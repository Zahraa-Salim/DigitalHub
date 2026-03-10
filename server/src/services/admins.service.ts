// File: server/src/services/admins.service.ts
// Purpose: Implements the business rules for admins.
// It coordinates validation, data access, and side effects before results go back to controllers.



import bcrypt from "bcryptjs";
import { withTransaction } from "../db/index.js";
import { ADMIN_ACTIONS } from "../constants/adminActions.js";
import {
  countAdmins,
  createAdminUser,
  findAdminByUserId,
  findAdminForUpdate,
  listAdmins,
  setAdminActiveByUserId,
  updateAdminUserById,
} from "../repositories/admins.repo.js";
import { upsertAdminProfile } from "../repositories/auth.repo.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery, parseQueryBoolean } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";

const ROLE_VALUES = new Set(["admin", "super_admin"]);

type AdminRole = "admin" | "super_admin";

type AdminListQuery = Record<string, unknown> & {
  role?: string;
  admin_role?: string;
  is_active?: string | boolean;
};

type AdminPayload = {
  email: string;
  password: string;
  full_name?: string;
  avatar_url?: string | null;
  job_title?: string | null;
  admin_role?: AdminRole;
  is_public?: boolean;
  sort_order?: number;
};

type AdminPatchPayload = {
  is_active?: boolean;
  full_name?: string;
  job_title?: string | null;
  avatar_url?: string | null;
  is_public?: boolean;
  sort_order?: number;
  admin_role?: AdminRole;
};

type AdminRow = {
  user_id: number;
  email: string;
  is_active: boolean;
  created_at: string | Date;
  last_login_at: string | Date | null;
  full_name: string | null;
  job_title: string | null;
  avatar_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  is_public: boolean | null;
  sort_order: number | null;
  admin_role: AdminRole | null;
};

type UniqueViolationError = { code?: string };

const SORT_COLUMN_MAP = {
  created_at: "u.created_at",
  last_login_at: "u.last_login_at",
  email: "u.email",
  full_name: "COALESCE(ap.full_name, 'Admin')",
  admin_role: "COALESCE(ap.admin_role, 'admin')",
  is_active: "u.is_active",
  sort_order: "COALESCE(ap.sort_order, 0)",
};

// Handles 'toAdminDto' workflow for this module.
function toAdminDto(row: AdminRow) {
  return {
    user_id: row.user_id,
    email: row.email,
    is_active: row.is_active,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    admin_profile: {
      full_name: row.full_name,
      job_title: row.job_title,
      avatar_url: row.avatar_url,
      is_public: row.is_public,
      sort_order: row.sort_order,
      admin_role: row.admin_role,
    },
  };
}

// Handles 'normalizeRoleQuery' workflow for this module.
function normalizeRoleQuery(value: unknown): AdminRole | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const role = String(value).trim().toLowerCase();
  if (!ROLE_VALUES.has(role)) {
    throw new AppError(400, "VALIDATION_ERROR", "Query param 'role' must be one of: admin, super_admin.");
  }
  return role as AdminRole;
}

// Handles 'listAdminsService' workflow for this module.
export async function listAdminsService(query: AdminListQuery) {
  const list = parseListQuery(
    query,
    ["created_at", "last_login_at", "email", "full_name", "admin_role", "is_active", "sort_order"],
    "created_at",
  );

  const role = normalizeRoleQuery(query.role ?? query.admin_role);
  const isActive = parseQueryBoolean(query.is_active, "is_active");

  const params: Array<string | boolean> = [];
  const where = ["u.is_admin = TRUE"];

  if (list.search) {
    params.push(`%${list.search}%`);
    where.push(buildSearchClause(["COALESCE(u.email, '')", "COALESCE(ap.full_name, '')"], params.length));
  }

  if (role) {
    params.push(role);
    where.push(`COALESCE(ap.admin_role, 'admin') = $${params.length}`);
  }

  if (isActive !== undefined) {
    params.push(isActive);
    where.push(`u.is_active = $${params.length}`);
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;
  const sortColumn = SORT_COLUMN_MAP[list.sortBy as keyof typeof SORT_COLUMN_MAP];
  const countResult = await countAdmins(whereClause, params);
  const total = Number(countResult.rows[0]?.total ?? 0);
  const dataResult = await listAdmins(whereClause, sortColumn, list.order, params, list.limit, list.offset);

  return {
    data: dataResult.rows.map(toAdminDto),
    pagination: buildPagination(list.page, list.limit, total),
  };
}

// Handles 'createAdminService' workflow for this module.
export async function createAdminService(actorUserId: number, payload: AdminPayload) {
  return withTransaction(async (client: Parameters<typeof createAdminUser>[1]) => {
    try {
      const email = String(payload.email || "").trim().toLowerCase();
      const passwordHash = await bcrypt.hash(payload.password, 10);
      const userResult = await createAdminUser({ email, password_hash: passwordHash }, client);
      const userId = Number(userResult.rows[0]?.id);

      const fullName = payload.full_name?.trim() || "Admin";
      await upsertAdminProfile(
        userId,
        {
          full_name: fullName,
          avatar_url: payload.avatar_url ?? null,
          bio: null,
          job_title: payload.job_title?.trim() || null,
          linkedin_url: null,
          github_url: null,
          portfolio_url: null,
          admin_role: payload.admin_role ?? "admin",
          is_public: payload.is_public ?? true,
          sort_order: payload.sort_order ?? 0,
        },
        client,
      );

      const refreshResult = await findAdminByUserId(userId, client);
      const adminDto = toAdminDto(refreshResult.rows[0]);

      await logAdminAction(
        {
          actorUserId,
          action: ADMIN_ACTIONS.ADMIN_CREATED,
          entityType: "users",
          entityId: userId,
          message: `Admin account ${email} was created.`,
          metadata: {
            admin_role: adminDto.admin_profile.admin_role,
            is_active: true,
          },
          title: "Admin Created",
          body: `${email} was added as ${adminDto.admin_profile.admin_role}.`,
        },
        client,
      );

      return adminDto;
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "CONFLICT", "An account with this email already exists.");
      }
      throw error;
    }
  });
}

// Handles 'patchAdminService' workflow for this module.
export async function patchAdminService(targetUserId: number, actorUserId: number, payload: AdminPatchPayload) {
  return withTransaction(async (client: Parameters<typeof findAdminForUpdate>[1]) => {
    const existingResult = await findAdminForUpdate(targetUserId, client);
    if (!existingResult.rowCount) {
      throw new AppError(404, "NOT_FOUND", "Admin user not found.");
    }

    const existing = existingResult.rows[0] as AdminRow;
    if (targetUserId === actorUserId && payload.admin_role && payload.admin_role !== existing.admin_role) {
      throw new AppError(400, "VALIDATION_ERROR", "You cannot change your own admin role.");
    }

    const userPayload: { is_active?: boolean } = {};
    if (payload.is_active !== undefined) {
      userPayload.is_active = payload.is_active;
    }

    if (Object.keys(userPayload).length) {
      const { setClause, values } = buildUpdateQuery(userPayload, ["is_active"], 1);
      await updateAdminUserById(targetUserId, setClause, values, client);
    }

    if (
      payload.full_name !== undefined ||
      payload.job_title !== undefined ||
      payload.avatar_url !== undefined ||
      payload.is_public !== undefined ||
      payload.sort_order !== undefined ||
      payload.admin_role !== undefined
    ) {
      await upsertAdminProfile(
        targetUserId,
        {
          full_name: payload.full_name ?? existing.full_name ?? "Admin",
          avatar_url:
            payload.avatar_url !== undefined ? payload.avatar_url : existing.avatar_url ?? null,
          bio: existing.bio ?? null,
          job_title:
            payload.job_title !== undefined ? payload.job_title : existing.job_title ?? null,
          linkedin_url: existing.linkedin_url ?? null,
          github_url: existing.github_url ?? null,
          portfolio_url: existing.portfolio_url ?? null,
          admin_role: payload.admin_role ?? existing.admin_role ?? "admin",
          is_public: payload.is_public ?? existing.is_public ?? true,
          sort_order: payload.sort_order ?? existing.sort_order ?? 0,
        },
        client,
      );
    }

    const refreshResult = await findAdminByUserId(targetUserId, client);
    const adminDto = toAdminDto(refreshResult.rows[0]);

    await logAdminAction(
      {
        actorUserId,
        action: ADMIN_ACTIONS.ADMIN_UPDATED,
        entityType: "users",
        entityId: targetUserId,
        message: `Admin account ${adminDto.email} was updated.`,
        metadata: {
          updated_fields: Object.keys(payload),
          is_active: adminDto.is_active,
          admin_role: adminDto.admin_profile.admin_role,
        },
        title: "Admin Updated",
        body: `${adminDto.email} account details were updated.`,
      },
      client,
    );

    return adminDto;
  });
}

// Handles 'deactivateAdminService' workflow for this module.
export async function deactivateAdminService(targetUserId: number, actorUserId: number) {
  return setAdminActivationService(targetUserId, actorUserId, false);
}

// Handles 'activateAdminService' workflow for this module.
export async function activateAdminService(targetUserId: number, actorUserId: number) {
  return setAdminActivationService(targetUserId, actorUserId, true);
}

// Handles 'setAdminActivationService' workflow for this module.
async function setAdminActivationService(targetUserId: number, actorUserId: number, nextState: boolean) {
  return withTransaction(async (client: Parameters<typeof findAdminForUpdate>[1]) => {
    const existingResult = await findAdminForUpdate(targetUserId, client);
    if (!existingResult.rowCount) {
      throw new AppError(404, "NOT_FOUND", "Admin user not found.");
    }

    if (!nextState && targetUserId === actorUserId) {
      throw new AppError(400, "VALIDATION_ERROR", "You cannot deactivate your own account.");
    }

    await setAdminActiveByUserId(targetUserId, nextState, client);
    const refreshResult = await findAdminByUserId(targetUserId, client);
    const adminDto = toAdminDto(refreshResult.rows[0]);

    await logAdminAction(
      {
        actorUserId,
        action: nextState ? ADMIN_ACTIONS.ADMIN_ACTIVATED : ADMIN_ACTIONS.ADMIN_DEACTIVATED,
        entityType: "users",
        entityId: targetUserId,
        message: `Admin account ${adminDto.email} was ${nextState ? "activated" : "deactivated"}.`,
        metadata: { is_active: adminDto.is_active },
        title: nextState ? "Admin Activated" : "Admin Deactivated",
        body: `${adminDto.email} is now ${nextState ? "active" : "inactive"}.`,
      },
      client,
    );

    return adminDto;
  });
}

// Handles 'isUniqueViolation' workflow for this module.
function isUniqueViolation(error: unknown): error is UniqueViolationError {
  return typeof error === "object" && error !== null && "code" in error && (error as UniqueViolationError).code === "23505";
}

