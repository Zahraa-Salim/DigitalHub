// File Summary: server/src/services/programs.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { withTransaction } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause, buildUpdateQuery } from "../utils/sql.js";
import { closeCohort, countCohortInstructors, countCohorts, countPrograms, createCohort, createProgram, deleteCohort, deleteProgram, findActiveInstructor, findActiveProgramById, getCohortStatusById, listCohortInstructors, listCohorts, listPrograms, openCohort, softDeleteCohortsByProgramId, updateCohort, updateProgram, upsertCohortInstructor, } from "../repositories/programs.repo.js";
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
    const { setClause, values } = buildUpdateQuery(payload, ["slug", "title", "summary", "description", "requirements", "default_capacity", "is_published"], 1);
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
        await logAdminAction({
            actorUserId: adminId,
            action: "delete program",
            entityType: "programs",
            entityId: id,
            message: `Program ${result.rows[0].title} was deleted.`,
            title: "Program Deleted",
            body: `Program #${id} was deleted.`,
        }, client);
        return { id };
    });
}
export async function createCohortService(adminId, payload) {
    const activeProgramResult = await findActiveProgramById(payload.program_id);
    if (!activeProgramResult.rowCount) {
        throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found.");
    }
    if ((payload.allow_applications ?? false) && !payload.enrollment_open_at && !payload.enrollment_close_at) {
        throw new AppError(400, "VALIDATION_ERROR", "Allow applications cannot be enabled without enrollment date/time.");
    }
    const result = await createCohort({
        ...payload,
        status: payload.status ?? "planned",
        allow_applications: payload.allow_applications ?? false,
    });
    const cohort = result.rows[0];
    await logAdminAction({
        actorUserId: adminId,
        action: "create/update cohort",
        entityType: "cohorts",
        entityId: cohort.id,
        message: `Cohort ${cohort.name} was created.`,
        metadata: { status: cohort.status },
        title: "Cohort Created",
        body: `Cohort ${cohort.name} was created.`,
    });
    return cohort;
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
        params.push(list.status);
        where.push(`c.status = $${params.length}`);
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
    const oldStatusResult = await getCohortStatusById(id);
    if (!oldStatusResult.rowCount) {
        throw new AppError(404, "COHORT_NOT_FOUND", "Cohort not found.");
    }
    if (payload.program_id !== undefined) {
        const activeProgramResult = await findActiveProgramById(payload.program_id);
        if (!activeProgramResult.rowCount) {
            throw new AppError(404, "PROGRAM_NOT_FOUND", "Program not found.");
        }
    }
    if (payload.allow_applications === true && !payload.enrollment_open_at && !payload.enrollment_close_at) {
        throw new AppError(400, "VALIDATION_ERROR", "Allow applications cannot be enabled without enrollment date/time.");
    }
    const oldStatus = String(oldStatusResult.rows[0].status);
    const { setClause, values } = buildUpdateQuery(payload, ["program_id", "name", "status", "allow_applications", "capacity", "enrollment_open_at", "enrollment_close_at", "start_date", "end_date"], 1);
    const result = await updateCohort(id, setClause, values);
    const updated = result.rows[0];
    await logAdminAction({
        actorUserId: adminId,
        action: "create/update cohort",
        entityType: "cohorts",
        entityId: id,
        message: `Cohort ${id} was updated.`,
        metadata: { updated_fields: Object.keys(payload) },
        title: "Cohort Updated",
        body: `Cohort #${id} was edited.`,
    });
    if (payload.status && String(payload.status) !== oldStatus) {
        await logAdminAction({
            actorUserId: adminId,
            action: "change cohort status",
            entityType: "cohorts",
            entityId: id,
            message: `Cohort ${id} status changed from ${oldStatus} to ${payload.status}.`,
            metadata: { from: oldStatus, to: payload.status },
            title: "Cohort Status Changed",
            body: `Cohort #${id} status changed to ${payload.status}.`,
        });
    }
    return updated;
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
        await logAdminAction({
            actorUserId: adminId,
            action: "assign instructor",
            entityType: "cohort_instructors",
            entityId: cohortId,
            message: `Instructor ${input.instructor_user_id} was assigned to cohort ${cohortId}.`,
            metadata: { cohort_role: input.cohort_role },
            title: "Instructor Assigned",
            body: `Instructor #${input.instructor_user_id} assigned to cohort #${cohortId}.`,
        }, client);
        return upsertResult.rows[0];
    });
}


