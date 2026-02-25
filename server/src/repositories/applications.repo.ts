// File Summary: server/src/repositories/applications.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";
export async function createApplicant(fullName, email, phone, db = pool) {
    return db.query(`
      INSERT INTO applicants (full_name, email, phone, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [fullName, email, phone]);
}
export async function createApplication(cohortId, applicantId, applicantEmailNorm, applicantPhoneNorm, submissionAnswers, db = pool) {
    return db.query(`
      INSERT INTO applications (
        cohort_id,
        applicant_id,
        applicant_email_norm,
        applicant_phone_norm,
        submission_answers,
        status,
        submitted_at
      )
      SELECT $1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), 'pending', NOW()
      FROM cohorts c
      WHERE c.id = $1
        AND c.deleted_at IS NULL
      RETURNING *
    `, [cohortId, applicantId, applicantEmailNorm, applicantPhoneNorm, submissionAnswers ?? null]);
}
export async function createApplicationSubmission(applicationId, formId, answers, db = pool) {
    return db.query(`
      INSERT INTO application_submissions (application_id, form_id, answers, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [applicationId, formId, answers]);
}
export async function countApplications(whereClause, params, db = pool) {
    return db.query(`
      SELECT COUNT(*)::int AS total
      FROM applications a
      LEFT JOIN applicants ap ON ap.id = a.applicant_id
      JOIN cohorts c ON c.id = a.cohort_id AND c.deleted_at IS NULL
      ${whereClause}
    `, params);
}
export async function listApplications(whereClause, sortBy, order, params, limit, offset, db = pool) {
    return db.query(`
      SELECT
        a.id,
        a.cohort_id,
        c.name AS cohort_name,
        a.status,
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
        ap.phone
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
      ${whereClause}
      ORDER BY a.${sortBy} ${order}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `, [...params, limit, offset]);
}
export async function getApplicationForApproval(applicationId, db = pool) {
    return db.query(`
      SELECT
        a.id,
        a.status,
        a.cohort_id,
        ap.full_name,
        ap.email,
        ap.phone,
        c.capacity
      FROM applications a
      LEFT JOIN applicants ap ON ap.id = a.applicant_id
      JOIN cohorts c ON c.id = a.cohort_id AND c.deleted_at IS NULL
      WHERE a.id = $1
      FOR UPDATE
    `, [applicationId]);
}
export async function countActiveEnrollmentsByCohort(cohortId, db = pool) {
    return db.query(`
      SELECT COUNT(*)::int AS enrolled_count
      FROM enrollments
      WHERE cohort_id = $1
        AND status = 'active'
    `, [cohortId]);
}
export async function findUserByEmail(email, db = pool) {
    return db.query(`
      SELECT id, is_student
      FROM users
      WHERE email = $1
      LIMIT 1
    `, [email]);
}
export async function setUserAsStudent(userId, db = pool) {
    return db.query("UPDATE users SET is_student = TRUE WHERE id = $1", [userId]);
}
export async function createStudentUser(email, phone, passwordHash, db = pool) {
    return db.query(`
      INSERT INTO users (email, phone, password_hash, is_student, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, TRUE, TRUE, NOW(), NOW())
      RETURNING id
    `, [email, phone, passwordHash]);
}
export async function upsertStudentProfile(userId, fullName, db = pool) {
    return db.query(`
      INSERT INTO student_profiles
        (user_id, full_name, avatar_url, bio, linkedin_url, github_url, portfolio_url, is_public, featured, featured_rank, public_slug, created_at)
      VALUES
        ($1, $2, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, NULL, NULL, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET full_name = COALESCE(EXCLUDED.full_name, student_profiles.full_name)
    `, [userId, fullName]);
}
export async function createEnrollment(studentUserId, cohortId, applicationId, db = pool) {
    return db.query(`
      INSERT INTO enrollments (student_user_id, cohort_id, application_id, status, enrolled_at)
      VALUES ($1, $2, $3, 'active', NOW())
      RETURNING *
    `, [studentUserId, cohortId, applicationId]);
}
export async function markApplicationApproved(applicationId, reviewerId, reviewMessage, db = pool) {
    return db.query(`
      UPDATE applications
      SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_message = $3
      WHERE id = $2
      RETURNING *
    `, [reviewerId, applicationId, reviewMessage ?? null]);
}
export async function rejectPendingApplication(applicationId, reviewerId, reviewMessage, db = pool) {
    return db.query(`
      UPDATE applications
      SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_message = $3
      WHERE id = $2
        AND status = 'pending'
      RETURNING *
    `, [reviewerId, applicationId, reviewMessage ?? null]);
}


