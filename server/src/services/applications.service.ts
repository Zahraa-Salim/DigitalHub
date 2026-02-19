// File Summary: server/src/services/applications.service.ts
// Layer: services
// Purpose: Contains business logic, orchestration, and transaction-level behavior.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { withTransaction } from "../db/index.js";
import { AppError } from "../utils/appError.js";
import { logAdminAction } from "../utils/logAdminAction.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { buildPagination, parseListQuery } from "../utils/pagination.js";
import { buildSearchClause } from "../utils/sql.js";
import { countActiveEnrollmentsByCohort, countApplications, createApplicant, createApplication, createApplicationSubmission, createEnrollment, createStudentUser, findUserByEmail, getApplicationForApproval, listApplications, markApplicationApproved, rejectPendingApplication, setUserAsStudent, upsertStudentProfile, } from "../repositories/applications.repo.js";
export async function createApplicationService(payload) {
    const body = payload;
    const applicantEmailNorm = normalizeEmail(body.applicant.email);
    const applicantPhoneNorm = normalizePhone(body.applicant.phone);
    const applicantEmail = applicantEmailNorm;
    const applicantPhone = body.applicant.phone?.trim() || null;
    return withTransaction(async (client) => {
        const applicantResult = await createApplicant(body.applicant.full_name ?? null, applicantEmail, applicantPhone, client);
        const applicant = applicantResult.rows[0];
        let applicationResult;
        try {
            applicationResult = await createApplication(body.cohort_id, applicant.id, applicantEmailNorm, applicantPhoneNorm, client);
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                throw new AppError(409, "DUPLICATE_APPLICATION", "Form not submitted. You already submitted an application for this cohort with this email or phone.");
            }
            throw error;
        }
        const application = applicationResult.rows[0];
        if (body.form_id) {
            await createApplicationSubmission(application.id, body.form_id, body.answers ?? {}, client);
        }
        return application;
    });
}
export async function listApplicationsService(query) {
    const list = parseListQuery(query, ["id", "status", "submitted_at", "reviewed_at"], "submitted_at");
    const params = [];
    const where = [];
    if (list.search) {
        params.push(`%${list.search}%`);
        where.push(buildSearchClause(["COALESCE(ap.full_name, '')", "COALESCE(ap.email, '')", "c.name"], params.length));
    }
    if (list.status) {
        params.push(list.status);
        where.push(`a.status = $${params.length}`);
    }
    if (list.cohortId) {
        params.push(list.cohortId);
        where.push(`a.cohort_id = $${params.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await countApplications(whereClause, params);
    const total = Number(countResult.rows[0]?.total ?? 0);
    const dataResult = await listApplications(whereClause, list.sortBy, list.order, params, list.limit, list.offset);
    return {
        data: dataResult.rows,
        pagination: buildPagination(list.page, list.limit, total),
    };
}
export async function approveApplicationService(applicationId, reviewerId) {
    return withTransaction(async (client) => {
        const applicationResult = await getApplicationForApproval(applicationId, client);
        if (!applicationResult.rowCount) {
            throw new AppError(404, "APPLICATION_NOT_FOUND", "Application not found.");
        }
        const application = applicationResult.rows[0];
        if (application.status !== "pending") {
            throw new AppError(409, "APPLICATION_ALREADY_REVIEWED", "Only pending applications can be approved.");
        }
        if (!application.email) {
            throw new AppError(400, "VALIDATION_ERROR", "Applicant email is required to approve application.");
        }
        if (application.capacity !== null) {
            const capacityResult = await countActiveEnrollmentsByCohort(application.cohort_id, client);
            const enrolledCount = Number(capacityResult.rows[0]?.enrolled_count ?? 0);
            if (enrolledCount >= application.capacity) {
                throw new AppError(409, "COHORT_CAPACITY_EXCEEDED", "Cohort capacity has been reached.");
            }
        }
        let studentUserId;
        let generatedPassword = null;
        const existingUserResult = await findUserByEmail(application.email.toLowerCase(), client);
        if (existingUserResult.rowCount) {
            studentUserId = Number(existingUserResult.rows[0].id);
            if (!existingUserResult.rows[0].is_student) {
                await setUserAsStudent(studentUserId, client);
            }
        }
        else {
            generatedPassword = `DH-${crypto.randomBytes(6).toString("hex")}`;
            const passwordHash = await bcrypt.hash(generatedPassword, 10);
            const userInsert = await createStudentUser(application.email.toLowerCase(), application.phone, passwordHash, client);
            studentUserId = Number(userInsert.rows[0].id);
        }
        await upsertStudentProfile(studentUserId, application.full_name ?? "Student", client);
        const enrollmentResult = await createEnrollment(studentUserId, application.cohort_id, applicationId, client);
        const enrollment = enrollmentResult.rows[0];
        await markApplicationApproved(applicationId, reviewerId, client);
        await logAdminAction({
            actorUserId: reviewerId,
            action: "approve application",
            entityType: "applications",
            entityId: applicationId,
            message: `Application ${applicationId} was approved.`,
            metadata: {
                cohort_id: application.cohort_id,
                student_user_id: studentUserId,
            },
            title: "Application Approved",
            body: `Application #${applicationId} was approved.`,
        }, client);
        await logAdminAction({
            actorUserId: reviewerId,
            action: "create enrollment",
            entityType: "enrollments",
            entityId: enrollment.id,
            message: `Enrollment ${enrollment.id} was created from application ${applicationId}.`,
            metadata: {
                cohort_id: application.cohort_id,
                student_user_id: studentUserId,
            },
            title: "Enrollment Created",
            body: `Enrollment #${enrollment.id} was created.`,
        }, client);
        return {
            application_id: applicationId,
            status: "approved",
            student_user_id: studentUserId,
            enrollment_id: enrollment.id,
            generated_password: generatedPassword,
        };
    });
}
export async function rejectApplicationService(applicationId, reviewerId, reason) {
    const result = await rejectPendingApplication(applicationId, reviewerId);
    if (!result.rowCount) {
        throw new AppError(409, "APPLICATION_ALREADY_REVIEWED", "Pending application not found.");
    }
    await logAdminAction({
        actorUserId: reviewerId,
        action: "reject application",
        entityType: "applications",
        entityId: applicationId,
        message: `Application ${applicationId} was rejected.`,
        metadata: { reason: reason ?? null },
        title: "Application Rejected",
        body: `Application #${applicationId} was rejected.`,
    });
    return result.rows[0];
}
function isUniqueViolation(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}


