// File: server/src/repositories/applications.repo.ts
// Purpose: Runs the database queries used for applications.
// It keeps SQL reads and writes in one place so higher layers stay focused on application logic.

import { pool } from "../db/index.js";
import type { DbClient } from "../db/index.js";

type ApplicationInterviewUpsertInput = {
    application_id: number;
    scheduled_at: string | Date;
    duration_minutes?: number | null;
    location_type?: string | null;
    location_details?: string | null;
    confirm_token?: string | null;
    created_by?: number | null;
};

type ApplicationMessageDraftInput = {
    application_id: number;
    channel: string;
    to_value: string;
    subject?: string | null;
    body: string;
    template_key?: string | null;
    status?: string | null;
    created_by?: number | null;
};
// Handles 'createApplicant' workflow for this module.
export async function createApplicant(
    fullName: string | null,
    email: string | null,
    phone: string | null,
    db: DbClient = pool,
) {
    return db.query(`
      INSERT INTO applicants (full_name, email, phone, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [fullName, email, phone]);
}
// Handles 'createApplication' workflow for this module.
export async function createApplication(
    cohortId: number,
    applicantId: number | null,
    applicantEmailNorm: string | null,
    applicantPhoneNorm: string | null,
    submissionAnswers: unknown,
    db: DbClient = pool,
) {
    return db.query(`
      INSERT INTO applications (
        cohort_id,
        applicant_id,
        applicant_email_norm,
        applicant_phone_norm,
        submission_answers,
        stage,
        status,
        submitted_at
      )
      SELECT $1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), 'applied', 'applied', NOW()
      FROM cohorts c
      WHERE c.id = $1
        AND c.deleted_at IS NULL
      RETURNING *
    `, [cohortId, applicantId, applicantEmailNorm, applicantPhoneNorm, submissionAnswers ?? null]);
}
// Handles 'createApplicationSubmission' workflow for this module.
export async function createApplicationSubmission(
    applicationId: number,
    formId: number,
    answers: unknown,
    db: DbClient = pool,
) {
    return db.query(`
      INSERT INTO application_submissions (application_id, form_id, answers, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [applicationId, formId, answers]);
}
// Handles 'countApplications' workflow for this module.
export async function countApplications(whereClause: string, params: unknown[], db: DbClient = pool) {
    return db.query(`
      SELECT COUNT(*)::int AS total
      FROM applications a
      LEFT JOIN applicants ap ON ap.id = a.applicant_id
      JOIN cohorts c ON c.id = a.cohort_id AND c.deleted_at IS NULL
      ${whereClause}
    `, params);
}
// Handles 'listApplications' workflow for this module.
export async function listApplications(
    whereClause: string,
    sortBy: string,
    order: string,
    params: unknown[],
    limit: number,
    offset: number,
    db: DbClient = pool,
) {
    return db.query(`
      SELECT
        a.id,
        a.cohort_id,
        c.name AS cohort_name,
        a.status,
        a.stage,
        a.reviewed_by,
        a.reviewed_at,
        a.review_message,
        a.submitted_at,
        COALESCE(
          NULLIF(a.submission_answers, '{}'::jsonb),
          latest_submission.answers,
          '{}'::jsonb
        ) AS submission_answers,
        ap.id AS applicant_id,
        ap.full_name,
        ap.email,
        ap.phone,
        i.id AS interview_id,
        i.scheduled_at AS interview_scheduled_at,
        i.status AS interview_status,
        i.location_type AS interview_location_type,
        i.location_details AS interview_location_details,
        i.duration_minutes AS interview_duration_minutes,
        i.confirmed_at AS interview_confirmed_at,
        i.requested_at AS interview_requested_at
      FROM applications a
      LEFT JOIN applicants ap ON ap.id = a.applicant_id
      LEFT JOIN interviews i ON i.application_id = a.id
      LEFT JOIN LATERAL (
        SELECT s.answers
        FROM application_submissions s
        WHERE s.application_id = a.id
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT 1
      ) latest_submission ON TRUE
      JOIN cohorts c ON c.id = a.cohort_id AND c.deleted_at IS NULL
      ${whereClause}
      ORDER BY a.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
// Handles 'getApplicationForApproval' workflow for this module.
export async function getApplicationForApproval(applicationId: number, db: DbClient = pool) {
    return db.query(`
      SELECT
        a.id,
        a.status,
        a.stage,
        a.cohort_id,
        c.name AS cohort_name,
        ap.full_name,
        ap.email,
        ap.phone,
        c.capacity
      FROM applications a
      LEFT JOIN applicants ap ON ap.id = a.applicant_id
      JOIN cohorts c ON c.id = a.cohort_id AND c.deleted_at IS NULL
      WHERE a.id = $1
      FOR UPDATE OF a
    `, [applicationId]);
}
// Handles 'countActiveEnrollmentsByCohort' workflow for this module.
export async function countActiveEnrollmentsByCohort(cohortId: number, db: DbClient = pool) {
    return db.query(`
      SELECT COUNT(*)::int AS enrolled_count
      FROM enrollments
      WHERE cohort_id = $1
        AND status = 'active'
    `, [cohortId]);
}
// Handles 'findUserByEmail' workflow for this module.
export async function findUserByEmail(email: string | null, db: DbClient = pool) {
    return db.query(`
      SELECT id, is_student
      FROM users
      WHERE email = $1
      LIMIT 1
    `, [email]);
}

// Handles 'findUserByPhone' workflow for this module.
export async function findUserByPhone(phone: string | null, db: DbClient = pool) {
    return db.query(`
      SELECT id, is_student
      FROM users
      WHERE phone = $1
      LIMIT 1
    `, [phone]);
}
// Handles 'setUserAsStudent' workflow for this module.
export async function setUserAsStudent(userId: number, db: DbClient = pool) {
    return db.query("UPDATE users SET is_student = TRUE WHERE id = $1", [userId]);
}
// Handles 'createStudentUser' workflow for this module.
export async function createStudentUser(
    email: string | null,
    phone: string | null,
    passwordHash: string,
    db: DbClient = pool,
) {
    return db.query(`
      INSERT INTO users (email, phone, password_hash, is_student, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, TRUE, TRUE, NOW(), NOW())
      RETURNING id
    `, [email, phone, passwordHash]);
}
// Handles 'upsertStudentProfile' workflow for this module.
export async function upsertStudentProfile(userId: number, fullName: string | null, db: DbClient = pool) {
    return db.query(`
      INSERT INTO student_profiles
        (user_id, full_name, avatar_url, bio, linkedin_url, github_url, portfolio_url, is_public, featured, featured_rank, public_slug, created_at)
      VALUES
        ($1, $2, NULL, NULL, NULL, NULL, NULL, TRUE, FALSE, NULL, NULL, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET full_name = COALESCE(EXCLUDED.full_name, student_profiles.full_name)
    `, [userId, fullName]);
}
// Handles 'createEnrollment' workflow for this module.
export async function createEnrollment(
    studentUserId: number,
    cohortId: number,
    applicationId: number,
    db: DbClient = pool,
) {
    return db.query(`
      INSERT INTO enrollments (student_user_id, cohort_id, application_id, status, enrolled_at)
      VALUES ($1, $2, $3, 'active', NOW())
      RETURNING *
    `, [studentUserId, cohortId, applicationId]);
}
// Handles 'markApplicationApproved' workflow for this module.
export async function markApplicationApproved(
    applicationId: number,
    reviewerId: number,
    reviewMessage: string | null,
    db: DbClient = pool,
) {
    return db.query(`
      UPDATE applications
      SET status = 'participation_confirmed', stage = 'participation_confirmed', reviewed_by = $1, reviewed_at = NOW(), review_message = $3
      WHERE id = $2
      RETURNING *
    `, [reviewerId, applicationId, reviewMessage ?? null]);
}
// Handles 'rejectPendingApplication' workflow for this module.
export async function rejectPendingApplication(
    applicationId: number,
    reviewerId: number,
    reviewMessage: string | null,
    db: DbClient = pool,
) {
    return db.query(`
      UPDATE applications
      SET status = 'rejected', stage = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_message = $3
      WHERE id = $2
        AND status IN ('applied', 'reviewing', 'invited_to_interview', 'interview_confirmed', 'interview_completed', 'accepted')
      RETURNING *
    `, [reviewerId, applicationId, reviewMessage ?? null]);
}

// Handles 'findCohortFormResolution' workflow for this module.
export async function findCohortFormResolution(cohortId: number, formKey: string, db: DbClient = pool) {
    return db.query(`
      SELECT
        c.id AS cohort_id,
        c.application_form_id,
        f.id AS general_form_id
      FROM cohorts c
      LEFT JOIN forms f
        ON f.key = $2
       AND f.is_active = TRUE
      WHERE c.id = $1
        AND c.deleted_at IS NULL
      LIMIT 1
    `, [cohortId, formKey]);
}

// Handles 'getApplicationById' workflow for this module.
export async function getApplicationById(applicationId: number, db: DbClient = pool) {
    return db.query(`
      SELECT
        a.id,
        a.cohort_id,
        c.name AS cohort_name,
        a.applicant_id,
        ap.full_name,
        ap.email,
        ap.phone,
        a.status,
        a.stage,
        a.reviewed_by,
        a.reviewed_at,
        a.review_message,
        a.submitted_at,
        COALESCE(
          NULLIF(a.submission_answers, '{}'::jsonb),
          latest_submission.answers,
          '{}'::jsonb
        ) AS submission_answers
      FROM applications a
      LEFT JOIN applicants ap ON ap.id = a.applicant_id
      LEFT JOIN LATERAL (
        SELECT s.answers
        FROM application_submissions s
        WHERE s.application_id = a.id
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT 1
      ) latest_submission ON TRUE
      JOIN cohorts c ON c.id = a.cohort_id AND c.deleted_at IS NULL
      WHERE a.id = $1
      LIMIT 1
    `, [applicationId]);
}

// Handles 'getApplicationForPipelineUpdate' workflow for this module.
export async function getApplicationForPipelineUpdate(applicationId: number, db: DbClient = pool) {
    return db.query(`
      SELECT
        a.id,
        a.cohort_id,
        c.name AS cohort_name,
        a.status,
        a.stage,
        a.reviewed_by,
        a.reviewed_at,
        a.review_message,
        a.submitted_at,
        a.created_user_id,
        a.user_created_at,
        ap.full_name,
        ap.email,
        ap.phone
      FROM applications a
      LEFT JOIN applicants ap ON ap.id = a.applicant_id
      JOIN cohorts c ON c.id = a.cohort_id AND c.deleted_at IS NULL
      WHERE a.id = $1
      FOR UPDATE OF a
    `, [applicationId]);
}

// Handles 'getInterviewByApplicationId' workflow for this module.
export async function getInterviewByApplicationId(applicationId: number, db: DbClient = pool) {
    return db.query(`
      SELECT *
      FROM interviews
      WHERE application_id = $1
      LIMIT 1
    `, [applicationId]);
}

// Handles 'upsertInterviewByApplicationId' workflow for this module.
export async function upsertInterviewByApplicationId(input: ApplicationInterviewUpsertInput, db: DbClient = pool) {
    return db.query(`
      INSERT INTO interviews (
        application_id,
        scheduled_at,
        duration_minutes,
        location_type,
        location_details,
        status,
        applicant_response_note,
        requested_at,
        confirmed_at,
        confirm_token,
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'pending_confirmation',
        NULL,
        NULL,
        NULL,
        $6,
        $7,
        NOW(),
        NOW()
      )
      ON CONFLICT (application_id)
      DO UPDATE SET
        scheduled_at = EXCLUDED.scheduled_at,
        duration_minutes = EXCLUDED.duration_minutes,
        location_type = EXCLUDED.location_type,
        location_details = EXCLUDED.location_details,
        status = 'pending_confirmation',
        applicant_response_note = NULL,
        requested_at = NULL,
        confirmed_at = NULL,
        confirm_token = EXCLUDED.confirm_token,
        created_by = COALESCE(interviews.created_by, EXCLUDED.created_by),
        updated_at = NOW()
      RETURNING *
    `, [
        input.application_id,
        input.scheduled_at,
        input.duration_minutes ?? 30,
        input.location_type ?? "online",
        input.location_details ?? null,
        input.confirm_token,
        input.created_by ?? null,
    ]);
}

// Handles 'markInterviewCompletedByApplicationId' workflow for this module.
export async function markInterviewCompletedByApplicationId(applicationId: number, db: DbClient = pool) {
    return db.query(`
      UPDATE interviews
      SET status = 'completed',
          updated_at = NOW()
      WHERE application_id = $1
      RETURNING *
    `, [applicationId]);
}

// Handles 'findInterviewByTokenForUpdate' workflow for this module.
export async function findInterviewByTokenForUpdate(token: string, db: DbClient = pool) {
    return db.query(`
      SELECT *
      FROM interviews
      WHERE confirm_token = $1
      FOR UPDATE
    `, [token]);
}

// Handles 'confirmInterviewByToken' workflow for this module.
export async function confirmInterviewByToken(token: string, note: string | null, db: DbClient = pool) {
    return db.query(`
      UPDATE interviews
      SET status = 'confirmed',
          applicant_response_note = $2,
          confirmed_at = COALESCE(confirmed_at, NOW()),
          requested_at = NULL,
          updated_at = NOW()
      WHERE confirm_token = $1
      RETURNING *
    `, [token, note ?? null]);
}

// Handles 'requestInterviewRescheduleByToken' workflow for this module.
export async function requestInterviewRescheduleByToken(
    token: string,
    requestedAt: string | Date,
    note: string | null,
    db: DbClient = pool,
) {
    return db.query(`
      UPDATE interviews
      SET status = 'reschedule_requested',
          requested_at = $2,
          applicant_response_note = $3,
          updated_at = NOW()
      WHERE confirm_token = $1
      RETURNING *
    `, [token, requestedAt, note ?? null]);
}

// Handles 'listApplicationMessageDrafts' workflow for this module.
export async function listApplicationMessageDrafts(applicationId: number, db: DbClient = pool) {
    return db.query(`
      SELECT *
      FROM application_messages
      WHERE application_id = $1
      ORDER BY created_at DESC, id DESC
    `, [applicationId]);
}

// Handles 'createApplicationMessageDraft' workflow for this module.
export async function createApplicationMessageDraft(input: ApplicationMessageDraftInput, db: DbClient = pool) {
    return db.query(`
      INSERT INTO application_messages (
        application_id,
        channel,
        to_value,
        subject,
        body,
        template_key,
        status,
        created_by,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'draft'), $8, NOW())
      RETURNING *
    `, [
        input.application_id,
        input.channel,
        input.to_value,
        input.subject ?? null,
        input.body,
        input.template_key ?? null,
        input.status ?? "draft",
        input.created_by ?? null,
    ]);
}

// Handles 'getApplicationMessageForSend' workflow for this module.
export async function getApplicationMessageForSend(applicationId: number, messageId: number, db: DbClient = pool) {
    return db.query(`
      SELECT *
      FROM application_messages
      WHERE id = $2
        AND application_id = $1
      LIMIT 1
    `, [applicationId, messageId]);
}

// Handles 'markApplicationMessageSent' workflow for this module.
export async function markApplicationMessageSent(
    applicationId: number,
    messageId: number,
    renderedSubject: string | null = null,
    renderedBody: string | null = null,
    db: DbClient = pool,
) {
    return db.query(`
      UPDATE application_messages
      SET status = 'sent',
          subject = COALESCE($3, subject),
          body = COALESCE($4, body),
          sent_at = NOW()
      WHERE id = $2
        AND application_id = $1
      RETURNING *
    `, [applicationId, messageId, renderedSubject, renderedBody]);
}

// Handles 'markApplicationMessageFailed' workflow for this module.
export async function markApplicationMessageFailed(
    applicationId: number,
    messageId: number,
    renderedSubject: string | null = null,
    renderedBody: string | null = null,
    db: DbClient = pool,
) {
    return db.query(`
      UPDATE application_messages
      SET status = 'failed',
          subject = COALESCE($3, subject),
          body = COALESCE($4, body),
          sent_at = NULL
      WHERE id = $2
        AND application_id = $1
      RETURNING *
    `, [applicationId, messageId, renderedSubject, renderedBody]);
}

// Handles 'updateApplicationStageAndStatus' workflow for this module.
export async function updateApplicationStageAndStatus(
    applicationId: number,
    stage: string,
    status: string,
    reviewerId: number | null,
    reviewMessage: string | null,
    db: DbClient = pool,
) {
    return db.query(`
      UPDATE applications
      SET stage = $2,
          status = $3,
          reviewed_by = COALESCE($4, reviewed_by),
          reviewed_at = CASE WHEN $4 IS NULL THEN reviewed_at ELSE NOW() END,
          review_message = COALESCE($5, review_message)
      WHERE id = $1
      RETURNING *
    `, [applicationId, stage, status, reviewerId ?? null, reviewMessage ?? null]);
}

// Handles 'updateApplicationStatusOnly' workflow for this module.
export async function updateApplicationStatusOnly(
    applicationId: number,
    status: string,
    reviewerId: number | null,
    reviewMessage: string | null,
    db: DbClient = pool,
) {
    return db.query(`
      UPDATE applications
      SET status = $2,
          reviewed_by = COALESCE($3, reviewed_by),
          reviewed_at = CASE WHEN $3 IS NULL THEN reviewed_at ELSE NOW() END,
          review_message = COALESCE($4, review_message)
      WHERE id = $1
      RETURNING *
    `, [applicationId, status, reviewerId ?? null, reviewMessage ?? null]);
}

// Handles 'setApplicationCreatedUser' workflow for this module.
export async function setApplicationCreatedUser(applicationId: number, userId: number, db: DbClient = pool) {
    return db.query(`
      UPDATE applications
      SET created_user_id = $2,
          user_created_at = COALESCE(user_created_at, NOW())
      WHERE id = $1
      RETURNING *
    `, [applicationId, userId]);
}

// Handles 'ensureApplicationParticipationToken' workflow for this module.
export async function ensureApplicationParticipationToken(applicationId: number, token: string, db: DbClient = pool) {
    return db.query(`
      UPDATE applications
      SET participation_token = COALESCE(participation_token, $2)
      WHERE id = $1
      RETURNING participation_token
    `, [applicationId, token]);
}

// Handles 'findApplicationByParticipationTokenForUpdate' workflow for this module.
export async function findApplicationByParticipationTokenForUpdate(token: string, db: DbClient = pool) {
    return db.query(`
      SELECT id, stage, status
      FROM applications
      WHERE participation_token = $1
      FOR UPDATE
    `, [token]);
}

