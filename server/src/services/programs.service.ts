// File Summary: server/src/services/programs.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
import { createAnnouncement } from "../repositories/announcements.repo.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import {
  closeCohort,
  countCohortInstructors,
  countCohorts,
  countPrograms,
  createCohort,
  createProgram,
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

function normalizeCohortStatus(status) {
  if (!status) {
    return undefined;
  }

  const normalized = String(status).trim().toLowerCase();
  return normalized === "planned" ? "coming_soon" : normalized;
}

function assertValidStatus(status) {
  if (!COHORT_STATUSES.includes(status)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid cohort status value.");
  }
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function deriveCohortStatusFromDates(input) {
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

function resolveNextStatus(payload, existingRow = null) {
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

function isApplicationsEnabled(status) {
  return status === "open";
}

async function createComingSoonAnnouncement(adminId, cohort, dbClient) {
  const cohortName = cohort?.name || `Cohort #${cohort.id}`;
  const programName = cohort?.program_title || "this program";

  const announcementResult = await createAnnouncement(
    {
      title: `${cohortName} is coming soon`,
      body: `Applications for ${cohortName} in ${programName} will open soon. Stay tuned for enrollment updates.`,
      target_audience: "website",
      cohort_id: cohort.id,
      is_auto: true,
      is_published: true,
      publish_at: new Date().toISOString(),
      created_by: adminId,
    },
    dbClient,
  );

  const announcement = announcementResult.rows[0];
  await logAdminAction(
    {
      actorUserId: adminId,
      action: "create announcement",
      entityType: "announcements",
      entityId: announcement.id,
      message: `Auto announcement created for cohort ${cohortName}.`,
      metadata: { cohort_id: cohort.id, is_auto: true },
      title: "Auto Announcement Created",
      body: `Announcement for ${cohortName} was automatically published.`,
    },
    dbClient,
  );
}

export async function createProgramService(adminId, payload) {
  const result = await createProgram({
    ...payload,
    is_published: payload.is_published ?? true,
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

export async function listProgramsService(query) {
  const list = parseListQuery(query, ["id", "title", "slug", "created_at", "updated_at"], "updated_at");
  const params = [];
  const where = [];

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

export async function patchProgramService(id, adminId, payload) {
  const { setClause, values } = buildUpdateQuery(
    payload,
    ["slug", "title", "summary", "description", "requirements", "default_capacity", "is_published"],
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
    metadata: { updated_fields: Object.keys(payload) },
    title: "Program Updated",
    body: `Program #${id} was edited.`,
  });

  return result.rows[0];
}

export async function deleteProgramService(id, adminId) {
  return withTransaction(async (client) => {
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

export async function createCohortService(adminId, payload) {
  return withTransaction(async (client) => {
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
      capacity: payload.capacity ?? null,
      enrollment_open_at: payload.enrollment_open_at ?? null,
      enrollment_close_at: payload.enrollment_close_at ?? null,
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
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

    if (payload.auto_announce && nextStatus === "coming_soon") {
      const createdCohortResult = await getCohortStatusById(cohort.id, client);
      if (createdCohortResult.rowCount) {
        await createComingSoonAnnouncement(adminId, createdCohortResult.rows[0], client);
      }
    }

    return cohort;
  });
}

export async function listCohortsService(query) {
  const list = parseListQuery(query, ["id", "name", "status", "created_at", "updated_at", "start_date"], "updated_at");
  const params = [];
  const where = [];

  if (list.search) {
    params.push(`%${list.search}%`);
    where.push(buildSearchClause(["c.name", "p.title"], params.length));
  }

  if (list.status) {
    params.push(normalizeCohortStatus(list.status));
    where.push(`(CASE WHEN c.status = 'planned' THEN 'coming_soon' ELSE c.status END) = $${params.length}`);
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

export async function patchCohortService(id, adminId, payload) {
  return withTransaction(async (client) => {
    const oldStatusResult = await getCohortStatusById(id, client);
    if (!oldStatusResult.rowCount) {
      throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }

    const currentRow = oldStatusResult.rows[0];
    const previousStatus = normalizeCohortStatus(currentRow.status);

    if (payload.program_id !== undefined) {
      const activeProgramResult = await findActiveProgramById(payload.program_id, client);
      if (!activeProgramResult.rowCount) {
        throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found.");
      }
    }

    const nextStatus = resolveNextStatus(payload, currentRow);
    const updatePayload = {
      ...payload,
      status: nextStatus,
      allow_applications: isApplicationsEnabled(nextStatus),
    };

    delete updatePayload.auto_announce;

    const { setClause, values } = buildUpdateQuery(
      updatePayload,
      [
        "program_id",
        "name",
        "status",
        "allow_applications",
        "capacity",
        "enrollment_open_at",
        "enrollment_close_at",
        "start_date",
        "end_date",
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

    if (payload.auto_announce && nextStatus === "coming_soon" && previousStatus !== "coming_soon") {
      const refreshedCohortResult = await getCohortStatusById(id, client);
      if (refreshedCohortResult.rowCount) {
        await createComingSoonAnnouncement(adminId, refreshedCohortResult.rows[0], client);
      }
    }

    return updated;
  });
}

export async function deleteCohortService(id, adminId) {
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

export async function openCohortService(id, adminId) {
  const result = await openCohort(id);
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
  });

  return result.rows[0];
}

export async function closeCohortService(id, adminId) {
  const result = await closeCohort(id);
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
  });

  return result.rows[0];
}

export async function listCohortInstructorsService(id, query) {
  const list = parseListQuery(query, ["instructor_user_id", "full_name", "cohort_role"], "full_name");
  const params = [id];
  const where = ["ci.cohort_id = $1"];

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

export async function assignInstructorService(cohortId, adminId, input) {
  return withTransaction(async (client) => {
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
