// File Summary: server/src/repositories/programApplications.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for this domain data model.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";

export async function programApplicationsTableExists(db = pool) {
  const result = await db.query(
    `
      SELECT to_regclass('public.program_applications') IS NOT NULL AS exists
    `,
  );
  return Boolean(result.rows[0]?.exists);
}

async function applicationMessagesHasMetadataColumn(db = pool) {
  const result = await db.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'application_messages'
          AND column_name = 'metadata'
      ) AS exists
    `,
  );
  return Boolean(result.rows[0]?.exists);
}

export async function countProgramApplications(whereClause, params, db = pool) {
  return db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM program_applications pa
      LEFT JOIN applicants ap ON ap.id = pa.applicant_id
      JOIN programs p ON p.id = pa.program_id
      ${whereClause}
    `,
    params,
  );
}

export async function listProgramApplications(whereClause, sortBy, order, params, limit, offset, db = pool) {
  return db.query(
    `
      SELECT
        pa.id,
        pa.program_id,
        pa.cohort_id,
        pa.applicant_id,
        pa.applicant_email_norm,
        pa.applicant_phone_norm,
        pa.submission_answers,
        pa.stage,
        pa.reviewed_by,
        pa.reviewed_at,
        pa.review_message,
        pa.participation_confirmed_at,
        pa.participation_note,
        pa.user_created_at,
        pa.created_user_id,
        pa.created_at,
        pa.updated_at,
        pa.stage AS status,
        pa.created_at AS submitted_at,
        p.slug AS program_slug,
        p.title AS program_title,
        ap.full_name,
        ap.email,
        ap.phone,
        ap.full_name AS applicant_name,
        ap.email AS applicant_email,
        ap.phone AS applicant_phone,
        i.id AS interview_id,
        i.status AS interview_status,
        i.scheduled_at AS interview_scheduled_at,
        i.location_type AS interview_location_type,
        COALESCE(i.application_id, m.application_id) AS linked_application_id
      FROM program_applications pa
      LEFT JOIN applicants ap ON ap.id = pa.applicant_id
      JOIN programs p ON p.id = pa.program_id
      LEFT JOIN LATERAL (
        SELECT x.id, x.status, x.scheduled_at, x.location_type, x.application_id
        FROM interviews x
        WHERE x.program_application_id = pa.id
        ORDER BY x.updated_at DESC, x.id DESC
        LIMIT 1
      ) i ON TRUE
      LEFT JOIN LATERAL (
        SELECT x.application_id
        FROM application_messages x
        WHERE x.program_application_id = pa.id
          AND x.application_id IS NOT NULL
        ORDER BY x.created_at DESC, x.id DESC
        LIMIT 1
      ) m ON TRUE
      ${whereClause}
      ORDER BY pa.${sortBy} ${order}, pa.id DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, limit, offset],
  );
}

export async function getProgramApplicationById(programApplicationId, db = pool) {
  return db.query(
    `
      SELECT
        pa.*,
        p.slug AS program_slug,
        p.title AS program_title,
        p.summary AS program_summary,
        p.description AS program_description,
        p.requirements AS program_requirements,
        p.default_capacity AS program_default_capacity,
        ap.full_name AS applicant_full_name,
        ap.email AS applicant_email,
        ap.phone AS applicant_phone,
        COALESCE(i.application_id, m.application_id) AS linked_application_id
      FROM program_applications pa
      JOIN programs p ON p.id = pa.program_id
      LEFT JOIN applicants ap ON ap.id = pa.applicant_id
      LEFT JOIN LATERAL (
        SELECT x.application_id
        FROM interviews x
        WHERE x.program_application_id = pa.id
          AND x.application_id IS NOT NULL
        ORDER BY x.updated_at DESC, x.id DESC
        LIMIT 1
      ) i ON TRUE
      LEFT JOIN LATERAL (
        SELECT x.application_id
        FROM application_messages x
        WHERE x.program_application_id = pa.id
          AND x.application_id IS NOT NULL
        ORDER BY x.created_at DESC, x.id DESC
        LIMIT 1
      ) m ON TRUE
      WHERE pa.id = $1
      LIMIT 1
    `,
    [programApplicationId],
  );
}

export async function getProgramApplicationForUpdate(programApplicationId, db = pool) {
  return db.query(
    `
      SELECT
        pa.*,
        p.slug AS program_slug,
        p.title AS program_title,
        ap.full_name AS applicant_full_name,
        ap.email AS applicant_email,
        ap.phone AS applicant_phone
      FROM program_applications pa
      JOIN programs p ON p.id = pa.program_id
      LEFT JOIN applicants ap ON ap.id = pa.applicant_id
      WHERE pa.id = $1
      FOR UPDATE OF pa
    `,
    [programApplicationId],
  );
}

export async function getInterviewByProgramApplicationId(programApplicationId, db = pool) {
  return db.query(
    `
      SELECT *
      FROM interviews
      WHERE program_application_id = $1
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `,
    [programApplicationId],
  );
}

export async function listProgramApplicationMessages(programApplicationId, db = pool) {
  return db.query(
    `
      SELECT *
      FROM application_messages
      WHERE program_application_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [programApplicationId],
  );
}

export async function updateProgramApplicationStage(
  programApplicationId,
  stage,
  reviewerId,
  reviewMessage,
  db = pool,
) {
  return db.query(
    `
      UPDATE program_applications
      SET stage = $2,
          reviewed_by = COALESCE($3, reviewed_by),
          reviewed_at = CASE WHEN $3 IS NULL THEN reviewed_at ELSE NOW() END,
          review_message = CASE WHEN $4::text IS NULL THEN review_message ELSE $4::text END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [programApplicationId, stage, reviewerId ?? null, reviewMessage ?? null],
  );
}

export async function updateProgramApplicationStageIfMatch(
  programApplicationId,
  currentStage,
  nextStage,
  db = pool,
) {
  return db.query(
    `
      UPDATE program_applications
      SET stage = $3,
          updated_at = NOW()
      WHERE id = $1
        AND stage = $2
      RETURNING *
    `,
    [programApplicationId, currentStage, nextStage],
  );
}

export async function markProgramApplicationParticipationConfirmed(
  programApplicationId,
  reviewerId,
  note,
  db = pool,
) {
  return db.query(
    `
      UPDATE program_applications
      SET stage = 'participation_confirmed',
          reviewed_by = COALESCE($2, reviewed_by),
          reviewed_at = CASE WHEN $2 IS NULL THEN reviewed_at ELSE NOW() END,
          participation_confirmed_at = COALESCE(participation_confirmed_at, NOW()),
          participation_note = CASE WHEN $3::text IS NULL THEN participation_note ELSE $3::text END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [programApplicationId, reviewerId ?? null, note ?? null],
  );
}

export async function setProgramApplicationCreatedUser(programApplicationId, userId, db = pool) {
  return db.query(
    `
      UPDATE program_applications
      SET created_user_id = $2,
          user_created_at = COALESCE(user_created_at, NOW()),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [programApplicationId, userId],
  );
}

export async function upsertInterviewByProgramApplicationId(input, db = pool) {
  const existing = await getInterviewByProgramApplicationId(input.program_application_id, db);
  if (existing.rowCount) {
    return db.query(
      `
        UPDATE interviews
        SET application_id = CASE
              WHEN interviews.application_id IS NULL
                AND $8::bigint IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM interviews i2
                  WHERE i2.application_id = $8::bigint
                    AND i2.id <> interviews.id
                )
              THEN $8::bigint
              ELSE interviews.application_id
            END,
            scheduled_at = $2,
            duration_minutes = $3,
            location_type = $4,
            location_details = $5,
            status = 'pending_confirmation',
            applicant_response_note = NULL,
            requested_at = NULL,
            confirmed_at = NULL,
            confirm_token = $6,
            created_by = COALESCE(created_by, $7),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        existing.rows[0].id,
        input.scheduled_at,
        input.duration_minutes ?? 30,
        input.location_type ?? "online",
        input.location_details ?? null,
        input.confirm_token,
        input.created_by ?? null,
        input.application_id ?? null,
      ],
    );
  }

  if (input.application_id) {
    const existingByApplication = await db.query(
      `
        SELECT *
        FROM interviews
        WHERE application_id = $1
        LIMIT 1
      `,
      [input.application_id],
    );

    if (existingByApplication.rowCount) {
      return db.query(
        `
          UPDATE interviews
          SET program_application_id = COALESCE(program_application_id, $2),
              scheduled_at = $3,
              duration_minutes = $4,
              location_type = $5,
              location_details = $6,
              status = 'pending_confirmation',
              applicant_response_note = NULL,
              requested_at = NULL,
              confirmed_at = NULL,
              confirm_token = $7,
              created_by = COALESCE(created_by, $8),
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [
          existingByApplication.rows[0].id,
          input.program_application_id,
          input.scheduled_at,
          input.duration_minutes ?? 30,
          input.location_type ?? "online",
          input.location_details ?? null,
          input.confirm_token,
          input.created_by ?? null,
        ],
      );
    }
  }

  return db.query(
    `
      INSERT INTO interviews (
        application_id,
        program_application_id,
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
        $6,
        'pending_confirmation',
        NULL,
        NULL,
        NULL,
        $7,
        $8,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      input.application_id ?? null,
      input.program_application_id,
      input.scheduled_at,
      input.duration_minutes ?? 30,
      input.location_type ?? "online",
      input.location_details ?? null,
      input.confirm_token,
      input.created_by ?? null,
    ],
  );
}

export async function markProgramInterviewCompleted(programApplicationId, db = pool) {
  const interviewResult = await getInterviewByProgramApplicationId(programApplicationId, db);
  if (!interviewResult.rowCount) {
    return interviewResult;
  }

  return db.query(
    `
      UPDATE interviews
      SET status = 'completed',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [interviewResult.rows[0].id],
  );
}

export async function createProgramApplicationMessageDraft(input, db = pool) {
  const linkedApplicationId = await ensureLinkedApplicationIdForProgramApplication(
    input.program_application_id,
    db,
  );

  if (!linkedApplicationId) {
    throw new Error("Unable to resolve linked cohort application for program application message draft.");
  }

  const hasMetadata = await applicationMessagesHasMetadataColumn(db);
  if (hasMetadata) {
    return db.query(
      `
        INSERT INTO application_messages (
          application_id,
          program_application_id,
          channel,
          to_value,
          subject,
          body,
          template_key,
          status,
          sent_at,
          created_by,
          created_at,
          metadata
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          COALESCE($8, 'draft'),
          NULL,
          $9,
          NOW(),
          $10
        )
        RETURNING *
      `,
      [
        linkedApplicationId,
        input.program_application_id,
        input.channel,
        input.to_value,
        input.subject ?? null,
        input.body,
        input.template_key ?? null,
        input.status ?? "draft",
        input.created_by ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  return db.query(
    `
        INSERT INTO application_messages (
          application_id,
          program_application_id,
          channel,
          to_value,
          subject,
          body,
          template_key,
          status,
          sent_at,
          created_by,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          COALESCE($8, 'draft'),
          NULL,
          $9,
          NOW()
        )
        RETURNING *
      `,
    [
      linkedApplicationId,
      input.program_application_id,
      input.channel,
      input.to_value,
      input.subject ?? null,
      input.body,
      input.template_key ?? null,
      input.status ?? "draft",
      input.created_by ?? null,
    ],
  );
}

export async function ensureLinkedApplicationIdForProgramApplication(programApplicationId, db = pool) {
  const baseResult = await db.query(
    `
      SELECT
        pa.id,
        pa.program_id,
        pa.cohort_id,
        pa.applicant_id,
        pa.applicant_email_norm,
        pa.applicant_phone_norm,
        pa.submission_answers,
        pa.stage
      FROM program_applications pa
      WHERE pa.id = $1
      LIMIT 1
    `,
    [programApplicationId],
  );

  if (!baseResult.rowCount) {
    return null;
  }

  const pa = baseResult.rows[0];
  let targetCohortId = pa.cohort_id ? Number(pa.cohort_id) : null;
  if (!targetCohortId) {
    const cohortResult = await db.query(
      `
        SELECT c.id
        FROM cohorts c
        WHERE c.program_id = $1
          AND c.deleted_at IS NULL
        ORDER BY
          CASE c.status
            WHEN 'open' THEN 0
            WHEN 'running' THEN 1
            WHEN 'coming_soon' THEN 2
            WHEN 'planned' THEN 3
            WHEN 'completed' THEN 4
            ELSE 5
          END,
          c.start_date NULLS LAST,
          c.id DESC
        LIMIT 1
      `,
      [pa.program_id],
    );
    if (cohortResult.rowCount) {
      targetCohortId = Number(cohortResult.rows[0].id);
    }
  }

  if (!targetCohortId) {
    return null;
  }

  const existingResult = await db.query(
    `
      SELECT a.id
      FROM applications a
      WHERE a.cohort_id = $1
        AND (
          ($2::bigint IS NOT NULL AND a.applicant_id = $2::bigint)
          OR ($3::text IS NOT NULL AND a.applicant_email_norm = $3::text)
          OR ($4::text IS NOT NULL AND a.applicant_phone_norm = $4::text)
        )
      ORDER BY a.submitted_at DESC, a.id DESC
      LIMIT 1
    `,
    [targetCohortId, pa.applicant_id ?? null, pa.applicant_email_norm ?? null, pa.applicant_phone_norm ?? null],
  );

  if (existingResult.rowCount) {
    return Number(existingResult.rows[0].id);
  }

  const fallbackStage = pa.stage || "applied";
  const fallbackStatus = pa.stage || "applied";

  if (pa.applicant_email_norm) {
    const created = await db.query(
      `
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
        VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), $6, $7, NOW())
        ON CONFLICT (cohort_id, applicant_email_norm)
          WHERE applicant_email_norm IS NOT NULL
        DO UPDATE SET
          applicant_id = COALESCE(applications.applicant_id, EXCLUDED.applicant_id)
        RETURNING id
      `,
      [
        targetCohortId,
        pa.applicant_id ?? null,
        pa.applicant_email_norm,
        pa.applicant_phone_norm ?? null,
        pa.submission_answers ?? {},
        fallbackStage,
        fallbackStatus,
      ],
    );
    return Number(created.rows[0].id);
  }

  if (pa.applicant_phone_norm) {
    const created = await db.query(
      `
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
        VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), $6, $7, NOW())
        ON CONFLICT (cohort_id, applicant_phone_norm)
          WHERE applicant_phone_norm IS NOT NULL
        DO UPDATE SET
          applicant_id = COALESCE(applications.applicant_id, EXCLUDED.applicant_id)
        RETURNING id
      `,
      [
        targetCohortId,
        pa.applicant_id ?? null,
        pa.applicant_email_norm ?? null,
        pa.applicant_phone_norm,
        pa.submission_answers ?? {},
        fallbackStage,
        fallbackStatus,
      ],
    );
    return Number(created.rows[0].id);
  }

  const created = await db.query(
    `
      INSERT INTO applications (
        cohort_id,
        applicant_id,
        submission_answers,
        stage,
        status,
        submitted_at
      )
      VALUES ($1, $2, COALESCE($3::jsonb, '{}'::jsonb), $4, $5, NOW())
      RETURNING id
    `,
    [targetCohortId, pa.applicant_id ?? null, pa.submission_answers ?? {}, fallbackStage, fallbackStatus],
  );
  return Number(created.rows[0].id);
}

export async function markProgramApplicationMessageSent(
  programApplicationId,
  messageId,
  renderedSubject = null,
  renderedBody = null,
  db = pool,
) {
  return db.query(
    `
      UPDATE application_messages
      SET status = 'sent',
          subject = COALESCE($3, subject),
          body = COALESCE($4, body),
          sent_at = NOW()
      WHERE id = $2
        AND program_application_id = $1
      RETURNING *
    `,
    [programApplicationId, messageId, renderedSubject, renderedBody],
  );
}

export async function markProgramApplicationMessageFailed(
  programApplicationId,
  messageId,
  errorMessage,
  renderedSubject = null,
  renderedBody = null,
  db = pool,
) {
  const hasMetadata = await applicationMessagesHasMetadataColumn(db);
  if (hasMetadata) {
    return db.query(
      `
        UPDATE application_messages
        SET status = 'failed',
            subject = COALESCE($4, subject),
            body = COALESCE($5, body),
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_error', $3::text),
            sent_at = NULL
        WHERE id = $2
          AND program_application_id = $1
        RETURNING *
      `,
      [programApplicationId, messageId, errorMessage ?? null, renderedSubject, renderedBody],
    );
  }

  return db.query(
    `
      UPDATE application_messages
      SET status = 'failed',
          subject = COALESCE($3, subject),
          body = COALESCE($4, body),
          sent_at = NULL
      WHERE id = $2
        AND program_application_id = $1
      RETURNING *
    `,
    [programApplicationId, messageId, renderedSubject, renderedBody],
  );
}

export async function getProgramApplicationMessageForSend(programApplicationId, messageId, db = pool) {
  return db.query(
    `
      SELECT *
      FROM application_messages
      WHERE id = $2
        AND program_application_id = $1
      LIMIT 1
    `,
    [programApplicationId, messageId],
  );
}

export async function getProgramApplicationMessageById(messageId, db = pool) {
  return db.query(
    `
      SELECT *
      FROM application_messages
      WHERE id = $1
        AND program_application_id IS NOT NULL
      LIMIT 1
    `,
    [messageId],
  );
}

export async function findUserByEmail(email, db = pool) {
  return db.query(
    `
      SELECT id, is_student
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );
}

export async function findUserByPhone(phone, db = pool) {
  return db.query(
    `
      SELECT id, is_student
      FROM users
      WHERE phone = $1
      LIMIT 1
    `,
    [phone],
  );
}

export async function createStudentUserForProgramApplication(email, phone, passwordHash, db = pool) {
  return db.query(
    `
      INSERT INTO users (email, phone, password_hash, is_student, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, TRUE, TRUE, NOW(), NOW())
      RETURNING id
    `,
    [email ?? null, phone ?? null, passwordHash ?? null],
  );
}

export async function setUserAsStudent(userId, db = pool) {
  return db.query(
    `
      UPDATE users
      SET is_student = TRUE
      WHERE id = $1
    `,
    [userId],
  );
}

export async function upsertStudentProfile(userId, fullName, db = pool) {
  return db.query(
    `
      INSERT INTO student_profiles (
        user_id,
        full_name,
        avatar_url,
        bio,
        linkedin_url,
        github_url,
        portfolio_url,
        is_public,
        featured,
        featured_rank,
        public_slug,
        created_at
      )
      VALUES ($1, $2, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, NULL, NULL, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET full_name = COALESCE(EXCLUDED.full_name, student_profiles.full_name)
      RETURNING user_id
    `,
    [userId, fullName],
  );
}

export async function upsertEnrollmentFromProgramApplication(studentUserId, cohortId, db = pool) {
  return db.query(
    `
      INSERT INTO enrollments (student_user_id, cohort_id, application_id, status, enrolled_at)
      VALUES ($1, $2, NULL, 'active', NOW())
      ON CONFLICT (student_user_id, cohort_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        enrolled_at = EXCLUDED.enrolled_at
      RETURNING *
    `,
    [studentUserId, cohortId],
  );
}

export async function markProgramApplicationParticipationConfirmedByLinkedApplicationId(
  applicationId,
  note = null,
  db = pool,
) {
  return db.query(
    `
      UPDATE program_applications pa
      SET stage = 'participation_confirmed',
          participation_confirmed_at = COALESCE(pa.participation_confirmed_at, NOW()),
          participation_note = COALESCE($2::text, pa.participation_note),
          updated_at = NOW()
      WHERE pa.id IN (
        SELECT i.program_application_id
        FROM interviews i
        WHERE i.application_id = $1
          AND i.program_application_id IS NOT NULL
        UNION
        SELECT m.program_application_id
        FROM application_messages m
        WHERE m.application_id = $1
          AND m.program_application_id IS NOT NULL
      )
      RETURNING pa.id
    `,
    [applicationId, note],
  );
}

export async function hasAcceptedProgramApplicationLinkedToApplication(applicationId, db = pool) {
  return db.query(
    `
      SELECT 1
      FROM program_applications pa
      WHERE pa.stage IN ('accepted', 'participation_confirmed')
        AND pa.id IN (
          SELECT i.program_application_id
          FROM interviews i
          WHERE i.application_id = $1
            AND i.program_application_id IS NOT NULL
          UNION
          SELECT m.program_application_id
          FROM application_messages m
          WHERE m.application_id = $1
            AND m.program_application_id IS NOT NULL
        )
      LIMIT 1
    `,
    [applicationId],
  );
}
