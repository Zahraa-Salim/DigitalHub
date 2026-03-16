// File: server/src/services/programs.service.ts
// Purpose: Implements the business rules for programs.
// It coordinates validation, data access, and side effects before results go back to controllers.


import { withTransaction } from "../db/index.js";
import { listCohortStudentsForAttendance } from "../repositories/attendance.repo.js";
import {
  createAnnouncement,
  deleteAnnouncement,
  findActiveAutoAnnouncementByCohortId,
  updateAnnouncement,
} from "../repositories/announcements.repo.js";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import type { DbClient } from "../db/index.js";
import {
  closeCohort,
  countCohortInstructors,
  countCohorts,
  countPrograms,
  createCohort,
  createProgram,
  deleteCohortInstructor,
  deleteCohort,
  deleteProgram,
  findActiveInstructor,
  findActiveProgramById,
  getCohortStatusById,
  listCohortInstructors,
  listCohorts,
  listPrograms,
  openCohort,
  softDeleteCohortsByProgramId,
  updateCohort,
  updateProgram,
  upsertCohortInstructor,
} from "../repositories/programs.repo.js";

const COHORT_STATUSES = ["coming_soon", "open", "running", "completed", "cancelled"];

type AnyRecord = Record<string, any>;
type QueryParams = Record<string, any>;

const PROGRAM_IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_PROGRAM_IMAGE_BYTES = 3 * 1024 * 1024;

// Handles 'sanitizeFilenamePart' workflow for this module.
function sanitizeFilenamePart(value: unknown) {
  return String(value || "program-image")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "program-image";
}

// Handles 'normalizeCohortStatus' workflow for this module.
function normalizeCohortStatus(status: unknown) {
  if (!status) {
    return undefined;
  }

  const normalized = String(status).trim().toLowerCase();
  return normalized === "planned" ? "coming_soon" : normalized;
}

// Handles 'assertValidStatus' workflow for this module.
function assertValidStatus(status: string) {
  if (!COHORT_STATUSES.includes(status)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid cohort status value.");
  }
}

// Handles 'toDate' workflow for this module.
function toDate(value: unknown) {
  if (!value) {
    return null;
  }

  const parsed =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Handles 'toJsonbValue' workflow for this module.
function toJsonbValue(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

// Handles 'deriveCohortStatusFromDates' workflow for this module.
function deriveCohortStatusFromDates(input: AnyRecord) {
  const now = new Date();
  const enrollmentOpenAt = toDate(input.enrollment_open_at);
  const enrollmentCloseAt = toDate(input.enrollment_close_at);
  const startDate = toDate(input.start_date);
  const endDate = toDate(input.end_date);

  if (endDate) {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    if (now > endOfDay) {
      return "completed";
    }
  }

  if (startDate) {
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    if (now >= startOfDay) {
      return "running";
    }
  }

  if (enrollmentOpenAt && now < enrollmentOpenAt) {
    return "coming_soon";
  }

  if (enrollmentOpenAt && (!enrollmentCloseAt || now <= enrollmentCloseAt)) {
    return "open";
  }

  if (!enrollmentOpenAt && enrollmentCloseAt && now <= enrollmentCloseAt) {
    return "open";
  }

  return "coming_soon";
}

// Handles 'resolveNextStatus' workflow for this module.
function resolveNextStatus(payload: AnyRecord, existingRow: AnyRecord | null = null) {
  const requestedStatus = normalizeCohortStatus(payload.status);
  if (requestedStatus) {
    assertValidStatus(requestedStatus);
    return requestedStatus;
  }

  const existingStatus = normalizeCohortStatus(existingRow?.status);
  if (existingStatus === "cancelled") {
    return "cancelled";
  }

  return deriveCohortStatusFromDates({
    enrollment_open_at:
      payload.enrollment_open_at !== undefined
        ? payload.enrollment_open_at
        : existingRow?.enrollment_open_at ?? null,
    enrollment_close_at:
      payload.enrollment_close_at !== undefined
        ? payload.enrollment_close_at
        : existingRow?.enrollment_close_at ?? null,
    start_date: payload.start_date !== undefined ? payload.start_date : existingRow?.start_date ?? null,
    end_date: payload.end_date !== undefined ? payload.end_date : existingRow?.end_date ?? null,
  });
}

// Handles 'isApplicationsEnabled' workflow for this module.
function isApplicationsEnabled(status: string | undefined) {
  return status === "open";
}

// Handles 'buildCohortAnnouncementContent' workflow for this module.
function buildCohortAnnouncementContent(cohort: AnyRecord, siteUrl = "") {
  const cohortName = cohort?.name || `Cohort #${cohort.id}`;
  const programName = cohort?.program_title || "this program";
  const status = normalizeCohortStatus(cohort?.status) || "coming_soon";
  const slug = cohort?.program_slug || "";
  const base = siteUrl ? siteUrl.replace(/\/$/, "") : "";
  const ctaUrl = slug
    ? `${base}/programs/${slug}`
    : cohort.id
      ? `${base}/cohorts/${cohort.id}`
      : null;

  if (status === "open") {
    return {
      title: `${cohortName} is now open`,
      body: `Applications are now open for ${cohortName} in ${programName}. Submit your application while enrollment is active.`,
      cta_label: "Apply Now",
      cta_url: ctaUrl,
    };
  }

  return {
    title: `${cohortName} is coming soon`,
    body: `Applications for ${cohortName} in ${programName} will open soon. Stay tuned for enrollment updates.`,
    cta_label: "Learn More",
    cta_url: ctaUrl,
  };
}

// Handles 'shouldShowCohortAnnouncement' workflow for this module.
function shouldShowCohortAnnouncement(cohort: AnyRecord, autoAnnounce: boolean) {
  const status = normalizeCohortStatus(cohort?.status);
  return Boolean(autoAnnounce) && (status === "coming_soon" || status === "open");
}

// Handles 'syncCohortAnnouncement' workflow for this module.
async function syncCohortAnnouncement(adminId: number, cohort: AnyRecord, autoAnnounce: boolean, dbClient: DbClient) {
  if (!cohort?.id) {
    return;
  }

  const existingResult = await findActiveAutoAnnouncementByCohortId(cohort.id, dbClient);
  const existing = existingResult.rows[0] ?? null;

  if (!shouldShowCohortAnnouncement(cohort, autoAnnounce)) {
    if (existing) {
      await deleteAnnouncement(existing.id, dbClient);
    }
    return;
  }

  const content = buildCohortAnnouncementContent(cohort, process.env.PUBLIC_SITE_URL || "");
  if (existing) {
    await updateAnnouncement(
      existing.id,
      "title = $1, body = $2, target_audience = $3, is_published = $4, publish_at = $5, event_id = NULL, cta_label = $6, cta_url = $7, cta_open_in_new_tab = TRUE",
      [content.title, content.body, "website", true, new Date().toISOString(), content.cta_label, content.cta_url],
      dbClient,
    );
    return;
  }

  await createAnnouncement(
    {
      title: content.title,
      body: content.body,
      target_audience: "website",
      cohort_id: cohort.id,
      event_id: null,
      is_auto: true,
      is_published: true,
      publish_at: new Date().toISOString(),
      cta_label: content.cta_label,
      cta_url: content.cta_url,
      cta_open_in_new_tab: true,
      created_by: adminId,
    },
    dbClient,
  );
}

// Handles 'createProgramService' workflow for this module.
export async function createProgramService(adminId: number, payload: AnyRecord) {
  const result = await createProgram({
    ...payload,
    image_url: payload.image_url === "" ? null : payload.image_url ?? null,
    is_published: payload.is_published ?? true,
    featured: payload.featured ?? false,
    featured_rank: payload.featured_rank ?? null,
    meta_title: payload.meta_title ?? null,
    meta_description: payload.meta_description ?? null,
    featured_image_url: payload.featured_image_url === "" ? null : payload.featured_image_url ?? null,
    created_by: adminId,
  });
  const program = result.rows[0];
  await logAdminAction({
    actorUserId: adminId,
    action: "create program",
    entityType: "programs",
    entityId: program.id,
    message: `Program ${program.title} was created.`,
    metadata: { slug: program.slug },
    title: "Program Created",
    body: `Program ${program.title} is now available in CMS.`,
  });
  return program;
}

// Handles 'listProgramsService' workflow for this module.
export async function listProgramsService(query: QueryParams) {
  const normalizedQuery = { ...query };
  if (normalizedQuery.limit !== undefined) {
    const parsedLimit = Number(normalizedQuery.limit);
    if (Number.isFinite(parsedLimit) && parsedLimit > 100) {
      normalizedQuery.limit = 100;
    }
  }

  const list = parseListQuery(normalizedQuery, ["id", "title", "slug", "created_at", "updated_at"], "updated_at");
  const params: Array<string | number | boolean | null> = [];
  const where: string[] = [];

  if (list.search) {
    params.push(`%${list.search}%`);
    where.push(buildSearchClause(["slug", "title", "COALESCE(summary, '')"], params.length));
  }

  if (list.isPublic !== undefined) {
    params.push(list.isPublic);
    where.push(`is_published = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await countPrograms(whereClause, params);
  const total = Number(countResult.rows[0]?.total ?? 0);
  const dataResult = await listPrograms(whereClause, list.sortBy, list.order, params, list.limit, list.offset);

  return {
    data: dataResult.rows,
    pagination: buildPagination(list.page, list.limit, total),
  };
}

// Handles 'patchProgramService' workflow for this module.
export async function patchProgramService(id: number, adminId: number, payload: AnyRecord) {
  const normalizedPayload = {
    ...payload,
    image_url: payload.image_url === "" ? null : payload.image_url,
    featured_image_url: payload.featured_image_url === "" ? null : payload.featured_image_url,
  };
  const { setClause, values } = buildUpdateQuery(
    normalizedPayload,
    ["slug", "title", "summary", "description", "requirements", "image_url", "default_capacity", "is_published", "featured", "featured_rank", "meta_title", "meta_description", "featured_image_url"],
    1,
  );

  const result = await updateProgram(id, setClause, values);
  if (!result.rowCount) {
    throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found.");
  }

  await logAdminAction({
    actorUserId: adminId,
    action: "update program",
    entityType: "programs",
    entityId: id,
    message: `Program ${id} was updated.`,
    metadata: { updated_fields: Object.keys(normalizedPayload) },
    title: "Program Updated",
    body: `Program #${id} was edited.`,
  });

  return result.rows[0];
}

// Handles 'uploadProgramImageService' workflow for this module.
export async function uploadProgramImageService(actorUserId: number, payload: AnyRecord) {
  const mimeType = String(payload.mime_type || "").trim().toLowerCase();
  const extension = PROGRAM_IMAGE_MIME_TO_EXT[mimeType];
  if (!extension) {
    throw new AppError(400, "VALIDATION_ERROR", "Unsupported program image mime type.");
  }

  const base64Raw = String(payload.data_base64 || "").trim();
  if (!base64Raw) {
    throw new AppError(400, "VALIDATION_ERROR", "Program image data is required.");
  }

  const normalizedBase64 = base64Raw.replace(/\s+/g, "");
  let fileBuffer = null;
  try {
    fileBuffer = Buffer.from(normalizedBase64, "base64");
  } catch (_error) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid program image payload.");
  }

  if (!fileBuffer || !fileBuffer.length) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid program image payload.");
  }

  if (fileBuffer.length > MAX_PROGRAM_IMAGE_BYTES) {
    throw new AppError(400, "VALIDATION_ERROR", "Program image must be 3MB or less.");
  }

  const safeBase = sanitizeFilenamePart(payload.filename);
  const fileName = `${actorUserId}-${Date.now()}-${randomBytes(8).toString("hex")}-${safeBase}.${extension}`;
  const programsDir = path.resolve(process.cwd(), "uploads", "programs");
  const filePath = path.join(programsDir, fileName);

  await fs.promises.mkdir(programsDir, { recursive: true });
  await fs.promises.writeFile(filePath, fileBuffer);

  const imageUrl = `/uploads/programs/${fileName}`;
  await logAdminAction({
    actorUserId,
    action: "program image uploaded",
    entityType: "programs",
    entityId: actorUserId,
    message: `Program image uploaded by admin ${actorUserId}.`,
    metadata: {
      mime_type: mimeType,
      bytes: fileBuffer.length,
      image_url: imageUrl,
    },
    title: "Program Image Uploaded",
    body: "Program image uploaded successfully.",
  });

  return { image_url: imageUrl };
}

// Handles 'deleteProgramService' workflow for this module.
export async function deleteProgramService(id: number, adminId: number) {
  return withTransaction(async (client: DbClient) => {
    const result = await deleteProgram(id, client);
    if (!result.rowCount) {
      throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found.");
    }

    await softDeleteCohortsByProgramId(id, client);

    await logAdminAction(
      {
        actorUserId: adminId,
        action: "delete program",
        entityType: "programs",
        entityId: id,
        message: `Program ${result.rows[0].title} was deleted.`,
        title: "Program Deleted",
        body: `Program #${id} was deleted.`,
      },
      client,
    );

    return { id };
  });
}

// Handles 'createCohortService' workflow for this module.
export async function createCohortService(adminId: number, payload: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
    const activeProgramResult = await findActiveProgramById(payload.program_id, client);
    if (!activeProgramResult.rowCount) {
      throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found.");
    }

    const nextStatus = resolveNextStatus(payload, null);

    const createPayload = {
      program_id: payload.program_id,
      name: payload.name,
      status: nextStatus,
      allow_applications: isApplicationsEnabled(nextStatus),
      auto_announce: payload.auto_announce ?? false,
      capacity: payload.capacity ?? null,
      enrollment_open_at: payload.enrollment_open_at ?? null,
      enrollment_close_at: payload.enrollment_close_at ?? null,
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
      attendance_days: toJsonbValue(payload.attendance_days ?? null),
      attendance_start_time: payload.attendance_start_time ?? null,
      attendance_end_time: payload.attendance_end_time ?? null,
    };

    const result = await createCohort(createPayload, client);
    const cohort = result.rows[0];

    await logAdminAction(
      {
        actorUserId: adminId,
        action: "create/update cohort",
        entityType: "cohorts",
        entityId: cohort.id,
        message: `Cohort ${cohort.name} was created.`,
        metadata: { status: cohort.status },
        title: "Cohort Created",
        body: `Cohort ${cohort.name} was created.`,
      },
      client,
    );

    const createdCohortResult = await getCohortStatusById(cohort.id, client);
    if (createdCohortResult.rowCount) {
      await syncCohortAnnouncement(
        adminId,
        createdCohortResult.rows[0],
        createdCohortResult.rows[0].auto_announce,
        client,
      );
    }

    return cohort;
  });
}

// Handles 'listCohortsService' workflow for this module.
export async function listCohortsService(query: QueryParams) {
  const list = parseListQuery(query, ["id", "name", "status", "created_at", "updated_at", "start_date"], "updated_at");
  const params: Array<string | number | boolean | null> = [];
  const where: string[] = [];

  if (list.search) {
    params.push(`%${list.search}%`);
    where.push(buildSearchClause(["c.name", "p.title"], params.length));
  }

  if (list.status) {
    const normalizedStatus = normalizeCohortStatus(list.status);
    if (normalizedStatus) {
      params.push(normalizedStatus);
      where.push(`(CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END) = $${params.length}`);
    }
  }

  if (list.cohortId) {
    params.push(list.cohortId);
    where.push(`c.id = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countResult = await countCohorts(whereClause, params);
  const total = Number(countResult.rows[0]?.total ?? 0);
  const dataResult = await listCohorts(whereClause, list.sortBy, list.order, params, list.limit, list.offset);

  return {
    data: dataResult.rows,
    pagination: buildPagination(list.page, list.limit, total),
  };
}

// Handles 'patchCohortService' workflow for this module.
export async function patchCohortService(id: number, adminId: number, payload: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
    const oldStatusResult = await getCohortStatusById(id, client);
    if (!oldStatusResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    const currentRow = oldStatusResult.rows[0];
    const previousStatus = normalizeCohortStatus(currentRow.status);
    const shouldAutoAnnounce =
      payload.auto_announce !== undefined ? Boolean(payload.auto_announce) : Boolean(currentRow.auto_announce);

    if (payload.program_id !== undefined) {
      const activeProgramResult = await findActiveProgramById(payload.program_id, client);
      if (!activeProgramResult.rowCount) {
        throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found.");
      }
    }

    const nextStatus = resolveNextStatus(payload, currentRow);
    const updatePayload = {
      ...payload,
      attendance_days:
        payload.attendance_days !== undefined
          ? toJsonbValue(payload.attendance_days)
          : payload.attendance_days,
      status: nextStatus,
      allow_applications: isApplicationsEnabled(nextStatus),
      auto_announce: shouldAutoAnnounce,
    };

    const { setClause, values } = buildUpdateQuery(
      updatePayload,
      [
        "program_id",
        "name",
        "status",
        "use_general_form",
        "application_form_id",
        "allow_applications",
        "auto_announce",
        "capacity",
        "enrollment_open_at",
        "enrollment_close_at",
        "start_date",
        "end_date",
        "attendance_days",
        "attendance_start_time",
        "attendance_end_time",
      ],
      1,
    );

    const result = await updateCohort(id, setClause, values, client);
    if (!result.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    const updated = result.rows[0];

    await logAdminAction(
      {
        actorUserId: adminId,
        action: "create/update cohort",
        entityType: "cohorts",
        entityId: id,
        message: `Cohort ${id} was updated.`,
        metadata: { updated_fields: Object.keys(updatePayload) },
        title: "Cohort Updated",
        body: `Cohort #${id} was edited.`,
      },
      client,
    );

    if (nextStatus !== previousStatus) {
      await logAdminAction(
        {
          actorUserId: adminId,
          action: "change cohort status",
          entityType: "cohorts",
          entityId: id,
          message: `Cohort ${id} status changed from ${previousStatus} to ${nextStatus}.`,
          metadata: { from: previousStatus, to: nextStatus },
          title: "Cohort Status Changed",
          body: `Cohort #${id} status changed to ${nextStatus}.`,
        },
        client,
      );
    }

    const refreshedCohortResult = await getCohortStatusById(id, client);
    if (refreshedCohortResult.rowCount) {
      await syncCohortAnnouncement(
        adminId,
        refreshedCohortResult.rows[0],
        refreshedCohortResult.rows[0].auto_announce,
        client,
      );
    }

    return updated;
  });
}

// Handles 'deleteCohortService' workflow for this module.
export async function deleteCohortService(id: number, adminId: number) {
  const result = await deleteCohort(id);
  if (!result.rowCount) {
    throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
  }

  await logAdminAction({
    actorUserId: adminId,
    action: "delete cohort",
    entityType: "cohorts",
    entityId: id,
    message: `Cohort ${result.rows[0].name} was deleted.`,
    title: "Cohort Deleted",
    body: `Cohort #${id} was deleted.`,
  });

  return { id };
}

// Handles 'openCohortService' workflow for this module.
export async function openCohortService(id: number, adminId: number) {
  return withTransaction(async (client: DbClient) => {
    const result = await openCohort(id, client);
    if (!result.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    await logAdminAction({
      actorUserId: adminId,
      action: "change cohort status",
      entityType: "cohorts",
      entityId: id,
      message: `Cohort ${id} was opened for applications.`,
      title: "Cohort Opened",
      body: `Cohort #${id} is now open for applications.`,
    }, client);

    const refreshedCohortResult = await getCohortStatusById(id, client);
    if (refreshedCohortResult.rowCount) {
      await syncCohortAnnouncement(
        adminId,
        refreshedCohortResult.rows[0],
        refreshedCohortResult.rows[0].auto_announce,
        client,
      );
    }

    return result.rows[0];
  });
}

// Handles 'closeCohortService' workflow for this module.
export async function closeCohortService(id: number, adminId: number) {
  return withTransaction(async (client: DbClient) => {
    const result = await closeCohort(id, client);
    if (!result.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    await logAdminAction({
      actorUserId: adminId,
      action: "change cohort status",
      entityType: "cohorts",
      entityId: id,
      message: `Cohort ${id} was closed for new applications.`,
      title: "Cohort Closed",
      body: `Cohort #${id} has stopped accepting applications.`,
    }, client);

    const refreshedCohortResult = await getCohortStatusById(id, client);
    if (refreshedCohortResult.rowCount) {
      await syncCohortAnnouncement(
        adminId,
        refreshedCohortResult.rows[0],
        refreshedCohortResult.rows[0].auto_announce,
        client,
      );
    }

    return result.rows[0];
  });
}

// Handles 'listCohortInstructorsService' workflow for this module.
export async function listCohortInstructorsService(id: number, query: QueryParams) {
  const list = parseListQuery(query, ["instructor_user_id", "full_name", "cohort_role"], "full_name");
  const params: Array<string | number> = [id];
  const where: string[] = ["ci.cohort_id = $1"];

  if (list.search) {
    params.push(`%${list.search}%`);
    where.push(buildSearchClause(["ip.full_name", "COALESCE(ip.expertise, '')", "ci.cohort_role"], params.length));
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;
  const countResult = await countCohortInstructors(whereClause, params);
  const total = Number(countResult.rows[0]?.total ?? 0);
  const result = await listCohortInstructors(whereClause, list.sortBy, list.order, params, list.limit, list.offset);

  return {
    data: result.rows,
    pagination: buildPagination(list.page, list.limit, total),
  };
}

export async function getCohortEnrollmentsService(cohortId: number) {
  const cohortCheck = await getCohortStatusById(cohortId);
  if (!cohortCheck.rowCount) {
    throw new AppError(404, "NOT_FOUND", "Cohort not found.");
  }

  const result = await listCohortStudentsForAttendance(cohortId);
  return {
    cohort_id: cohortId,
    students: result.rows.map((row: any) => ({
      student_user_id: Number(row.student_user_id),
      full_name: String(row.full_name || "").trim() || "Student",
      email: row.email ?? null,
      phone: row.phone ?? null,
      enrollment_status: row.enrollment_status ?? "active",
    })),
    total: result.rowCount ?? 0,
  };
}

// Handles 'assignInstructorService' workflow for this module.
export async function assignInstructorService(cohortId: number, adminId: number, input: AnyRecord) {
  return withTransaction(async (client: DbClient) => {
    const cohortResult = await getCohortStatusById(cohortId, client);
    if (!cohortResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    const instructorCheck = await findActiveInstructor(input.instructor_user_id, client);
    if (!instructorCheck.rowCount) {
      throw new AppError(404, "INSTRUCTOR_NOT_FOUND", "Instructor user not found or not active.");
    }

    const upsertResult = await upsertCohortInstructor(cohortId, input.instructor_user_id, input.cohort_role, client);
    if (!upsertResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    await logAdminAction(
      {
        actorUserId: adminId,
        action: "assign instructor",
        entityType: "cohort_instructors",
        entityId: cohortId,
        message: `Instructor ${input.instructor_user_id} was assigned to cohort ${cohortId}.`,
        metadata: { cohort_role: input.cohort_role },
        title: "Instructor Assigned",
        body: `Instructor #${input.instructor_user_id} assigned to cohort #${cohortId}.`,
      },
      client,
    );

    return upsertResult.rows[0];
  });
}

// Handles 'unassignInstructorService' workflow for this module.
export async function unassignInstructorService(cohortId: number, instructorUserId: number, adminId: number) {
  return withTransaction(async (client: DbClient) => {
    const cohortResult = await getCohortStatusById(cohortId, client);
    if (!cohortResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    const deleted = await deleteCohortInstructor(cohortId, instructorUserId, client);
    if (!deleted.rowCount) {
      throw new AppError(404, "NOT_FOUND", "Instructor assignment not found for this cohort.");
    }

    await logAdminAction(
      {
        actorUserId: adminId,
        action: "unassign instructor",
        entityType: "cohort_instructors",
        entityId: cohortId,
        message: `Instructor ${instructorUserId} was unassigned from cohort ${cohortId}.`,
        title: "Instructor Unassigned",
        body: `Instructor #${instructorUserId} removed from cohort #${cohortId}.`,
      },
      client,
    );

    return deleted.rows[0];
  });
}

