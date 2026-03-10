// File: server/src/services/projects.service.ts
// Purpose: Implements the business rules for projects.
// It coordinates validation, data access, and side effects before results go back to controllers.


import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import {
  countProjects,
  createProject,
  deleteProject,
  findCohortById,
  getPublicProjectById,
  listProjects,
  updateProject,
} from "../repositories/projects.repository.js";

const projectSortWhitelist = ["created_at", "updated_at", "sort_order", "title"];

type ProjectPayload = {
  student_user_id: number;
  cohort_id?: number | null;
  title: string;
  description?: string | null;
  image_url?: string | null;
  github_url?: string | null;
  live_url?: string | null;
  is_public?: boolean;
  sort_order?: number;
};

type ProjectListQuery = Record<string, unknown> & {
  student_user_id?: string | number;
};

type ProjectListOptions = {
  publicOnly?: boolean;
  publicSlug?: string;
};

// Handles 'parsePositiveInteger' workflow for this module.
function parsePositiveInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", `Query param '${fieldName}' must be a positive integer.`);
  }

  return parsed;
}

// Handles 'createProjectService' workflow for this module.
export async function createProjectService(adminId: number, payload: ProjectPayload) {
  if (payload.cohort_id !== undefined && payload.cohort_id !== null) {
    const cohortResult = await findCohortById(payload.cohort_id);
    if (!cohortResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }
  }

  const result = await createProject({
    student_user_id: payload.student_user_id,
    cohort_id: payload.cohort_id ?? null,
    title: payload.title,
    description: payload.description ?? null,
    image_url: payload.image_url ?? null,
    github_url: payload.github_url ?? null,
    live_url: payload.live_url ?? null,
    is_public: payload.is_public ?? false,
    sort_order: payload.sort_order ?? 0,
  });

  const created = result.rows[0];

  await logAdminAction({
    actorUserId: adminId,
    action: "PROJECT_CREATED",
    entityType: "project",
    entityId: created.id,
    message: `Project '${created.title}' created for student #${created.student_user_id}.`,
    metadata: {
      student_user_id: created.student_user_id,
      cohort_id: created.cohort_id ?? null,
      changed_fields: Object.keys(payload),
    },
    title: "Project Created",
    body: `Project '${created.title}' was created.`,
  });

  return created;
}

// Handles 'listProjectsService' workflow for this module.
export async function listProjectsService(query: ProjectListQuery, options: ProjectListOptions = {}) {
  const list = parseListQuery(query, projectSortWhitelist, "created_at");

  const params: Array<string | number | boolean> = [];
  const where: string[] = [];

  if (options.publicOnly) {
    where.push("p.is_public = TRUE");
  } else if (list.isPublic !== undefined) {
    params.push(list.isPublic);
    where.push(`p.is_public = $${params.length}`);
  }

  if (options.publicSlug) {
    params.push(options.publicSlug);
    where.push(`sp.public_slug = $${params.length}`);
    where.push("sp.is_public = TRUE");
  }

  if (list.search) {
    params.push(`%${list.search}%`);
    where.push(buildSearchClause(["p.title", "COALESCE(p.description, '')"], params.length));
  }

  if (list.cohortId !== undefined) {
    params.push(list.cohortId);
    where.push(`p.cohort_id = $${params.length}`);
  }

  if (!options.publicOnly && !options.publicSlug) {
    const studentUserId = parsePositiveInteger(query.student_user_id, "student_user_id");
    if (studentUserId !== undefined) {
      params.push(studentUserId);
      where.push(`p.student_user_id = $${params.length}`);
    }
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countResult = await countProjects(whereClause, params);
  const total = Number(countResult.rows[0]?.total ?? 0);

  const dataResult = await listProjects(
    whereClause,
    list.sortBy,
    list.order,
    params,
    list.limit,
    list.offset,
  );

  return {
    data: dataResult.rows,
    pagination: buildPagination(list.page, list.limit, total),
  };
}

// Handles 'patchProjectService' workflow for this module.
export async function patchProjectService(id: number, adminId: number, payload: Partial<ProjectPayload>) {
  if (payload.cohort_id !== undefined && payload.cohort_id !== null) {
    const cohortResult = await findCohortById(payload.cohort_id);
    if (!cohortResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }
  }

  const { setClause, values } = buildUpdateQuery(
    payload,
    ["student_user_id", "cohort_id", "title", "description", "image_url", "github_url", "live_url", "is_public", "sort_order"],
    1,
  );

  const result = await updateProject(id, setClause, values);
  if (!result.rowCount) {
    throw new AppError(404, "NOT_FOUND", "Project not found.");
  }

  const updated = result.rows[0];

  await logAdminAction({
    actorUserId: adminId,
    action: "PROJECT_UPDATED",
    entityType: "project",
    entityId: id,
    message: `Project #${id} was updated.`,
    metadata: {
      student_user_id: updated.student_user_id,
      cohort_id: updated.cohort_id ?? null,
      changed_fields: Object.keys(payload),
    },
    title: "Project Updated",
    body: `Project #${id} was edited.`,
  });

  return updated;
}

// Handles 'deleteProjectService' workflow for this module.
export async function deleteProjectService(id: number, adminId: number) {
  const result = await deleteProject(id);
  if (!result.rowCount) {
    throw new AppError(404, "NOT_FOUND", "Project not found.");
  }

  const deleted = result.rows[0];

  await logAdminAction({
    actorUserId: adminId,
    action: "PROJECT_DELETED",
    entityType: "project",
    entityId: id,
    message: `Project '${deleted.title}' was deleted.`,
    metadata: {
      student_user_id: deleted.student_user_id,
      cohort_id: deleted.cohort_id ?? null,
    },
    title: "Project Deleted",
    body: `Project '${deleted.title}' was deleted.`,
  });

  return { id };
}

// Handles 'getPublicProjectByIdService' workflow for this module.
export async function getPublicProjectByIdService(id: number) {
  const result = await getPublicProjectById(id);
  if (!result.rowCount) {
    throw new AppError(404, "NOT_FOUND", "Project not found.");
  }

  return result.rows[0];
}

