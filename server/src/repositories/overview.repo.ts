// File Summary: server/src/repositories/overview.repo.ts
// Layer: repositories
// Purpose: Executes parameterized SQL queries for admin overview aggregate metrics.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { pool } from "../db/index.js";

const PROGRAM_STAGES = [
  "applied",
  "reviewing",
  "invited_to_interview",
  "interview_confirmed",
  "accepted",
  "rejected",
  "participation_confirmed",
];

async function tableExists(tableName, db = pool) {
  const result = await db.query(
    `
      SELECT to_regclass($1) IS NOT NULL AS exists
    `,
    [`public.${tableName}`],
  );
  return Boolean(result.rows[0]?.exists);
}

async function columnExists(tableName, columnName, db = pool) {
  const result = await db.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS exists
    `,
    [tableName, columnName],
  );
  return Boolean(result.rows[0]?.exists);
}

function countValue(result) {
  return Number(result.rows[0]?.count ?? 0);
}

async function statusBuckets(whereClause, params, db = pool) {
  const result = await db.query(
    `
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
      FROM application_messages
      ${whereClause}
    `,
    params,
  );
  return {
    draft: Number(result.rows[0]?.draft ?? 0),
    sent: Number(result.rows[0]?.sent ?? 0),
    failed: Number(result.rows[0]?.failed ?? 0),
  };
}

async function getGeneralApplySummary(db = pool) {
  const exists = await tableExists("program_applications", db);
  if (!exists) {
    return Object.fromEntries(PROGRAM_STAGES.map((stage) => [stage, 0]));
  }

  const result = await db.query(
    `
      SELECT stage, COUNT(*)::int AS count
      FROM program_applications
      GROUP BY stage
    `,
  );

  const summary = Object.fromEntries(PROGRAM_STAGES.map((stage) => [stage, 0]));
  for (const row of result.rows) {
    if (row.stage in summary) {
      summary[row.stage] = Number(row.count);
    }
  }
  return summary;
}

async function getConversionMetrics(applicationsHasCreatedUserId, db = pool) {
  const exists = await tableExists("program_applications", db);
  if (!exists) {
    return {
      generalApplicants: 0,
      convertedToCohort: 0,
      convertedToUser: 0,
    };
  }

  const totalResult = await db.query(`SELECT COUNT(*)::int AS count FROM program_applications`);
  const hasLinkedColumn = await columnExists("program_applications", "linked_application_id", db);
  const hasCreatedUserColumn = await columnExists("program_applications", "created_user_id", db);

  let convertedToCohort = 0;
  if (hasLinkedColumn) {
    const linkedResult = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM program_applications
        WHERE linked_application_id IS NOT NULL
      `,
    );
    convertedToCohort = countValue(linkedResult);
  } else {
    const linkedResult = await db.query(
      `
        SELECT COUNT(DISTINCT pa.id)::int AS count
        FROM program_applications pa
        LEFT JOIN interviews i ON i.program_application_id = pa.id
        LEFT JOIN application_messages m ON m.program_application_id = pa.id
        WHERE i.application_id IS NOT NULL
           OR m.application_id IS NOT NULL
      `,
    );
    convertedToCohort = countValue(linkedResult);
  }

  let convertedToUser = 0;
  if (hasCreatedUserColumn) {
    const convertedResult = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM program_applications
        WHERE created_user_id IS NOT NULL
      `,
    );
    convertedToUser = countValue(convertedResult);
  } else if (applicationsHasCreatedUserId) {
    const convertedResult = await db.query(
      `
        SELECT COUNT(DISTINCT pa.id)::int AS count
        FROM program_applications pa
        LEFT JOIN interviews i ON i.program_application_id = pa.id
        LEFT JOIN application_messages m ON m.program_application_id = pa.id
        LEFT JOIN applications a ON a.id = COALESCE(i.application_id, m.application_id)
        WHERE a.created_user_id IS NOT NULL
      `,
    );
    convertedToUser = countValue(convertedResult);
  } else {
    const convertedResult = await db.query(
      `
        SELECT COUNT(DISTINCT pa.id)::int AS count
        FROM program_applications pa
        LEFT JOIN interviews i ON i.program_application_id = pa.id
        LEFT JOIN application_messages m ON m.program_application_id = pa.id
        LEFT JOIN enrollments e ON e.application_id = COALESCE(i.application_id, m.application_id)
        WHERE e.id IS NOT NULL
      `,
    );
    convertedToUser = countValue(convertedResult);
  }

  return {
    generalApplicants: countValue(totalResult),
    convertedToCohort,
    convertedToUser,
  };
}

export async function getAdminOverviewAggregates(includeSuperAdmin = false, db = pool) {
  const applicationsHasCreatedUserId = await columnExists("applications", "created_user_id", db);
  const applicationMessagesHasMetadata = await columnExists("application_messages", "metadata", db);

  const [
    newApplicationsResult,
    reviewingOver3DaysResult,
    invitedNoInterviewConfirmResult,
    interviewDoneNoDecisionResult,
    acceptedNoParticipationResult,
  ] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS count FROM applications WHERE status = 'applied'`),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM applications
        WHERE status = 'reviewing'
          AND NOW() - COALESCE(reviewed_at, submitted_at) > INTERVAL '3 days'
      `,
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        WHERE i.status = 'pending_confirmation'
      `,
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM interviews i
        JOIN applications a ON a.id = i.application_id
        WHERE i.status = 'completed'
          AND a.status NOT IN ('accepted', 'rejected', 'participation_confirmed')
      `,
    ),
    db.query(`SELECT COUNT(*)::int AS count FROM applications WHERE status = 'accepted'`),
  ]);

  let confirmedNoUser = 0;
  if (applicationsHasCreatedUserId) {
    const confirmedNoUserResult = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM applications
        WHERE status = 'participation_confirmed'
          AND created_user_id IS NULL
      `,
    );
    confirmedNoUser = countValue(confirmedNoUserResult);
  }

  const [todayResult, upcomingResult, pendingConfirmationsResult, rescheduleRequestsResult, confirmRateResult] =
    await Promise.all([
      db.query(
        `
          SELECT COUNT(*)::int AS count
          FROM interviews
          WHERE scheduled_at::date = CURRENT_DATE
            AND status <> 'cancelled'
        `,
      ),
      db.query(
        `
          SELECT COUNT(*)::int AS count
          FROM interviews
          WHERE scheduled_at > NOW()
            AND scheduled_at <= NOW() + INTERVAL '7 days'
            AND status <> 'cancelled'
        `,
      ),
      db.query(`SELECT COUNT(*)::int AS count FROM interviews WHERE status = 'pending_confirmation'`),
      db.query(`SELECT COUNT(*)::int AS count FROM interviews WHERE status = 'reschedule_requested'`),
      db.query(
        `
          SELECT
            COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_count,
            COUNT(*) FILTER (WHERE status = 'pending_confirmation')::int AS pending_count
          FROM interviews
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `,
      ),
    ]);

  const confirmedCount = Number(confirmRateResult.rows[0]?.confirmed_count ?? 0);
  const pendingCount = Number(confirmRateResult.rows[0]?.pending_count ?? 0);
  const confirmDenominator = confirmedCount + pendingCount;
  const confirmRate = confirmDenominator > 0 ? Number((confirmedCount / confirmDenominator).toFixed(4)) : 0;

  const acceptedResult = await db.query(
    `
      SELECT COUNT(*)::int AS count
      FROM applications
      WHERE status IN ('accepted', 'participation_confirmed')
    `,
  );
  const participationConfirmedResult = await db.query(
    `
      SELECT COUNT(*)::int AS count
      FROM applications
      WHERE status = 'participation_confirmed'
    `,
  );

  let userCreated = 0;
  if (applicationsHasCreatedUserId) {
    const userCreatedResult = await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM applications
        WHERE created_user_id IS NOT NULL
      `,
    );
    userCreated = countValue(userCreatedResult);
  } else {
    const userCreatedResult = await db.query(
      `
        SELECT COUNT(DISTINCT e.application_id)::int AS count
        FROM enrollments e
        WHERE e.application_id IS NOT NULL
      `,
    );
    userCreated = countValue(userCreatedResult);
  }

  const enrollmentCreatedResult = await db.query(
    `
      SELECT COUNT(*)::int AS count
      FROM enrollments e
      LEFT JOIN applications a ON a.id = e.application_id
      WHERE (a.status IN ('accepted', 'participation_confirmed'))
         OR (a.id IS NULL AND e.enrolled_at >= NOW() - INTERVAL '90 days')
    `,
  );

  const emailStats = await statusBuckets("WHERE channel = 'email'", [], db);
  const whatsappStats = applicationMessagesHasMetadata
    ? await statusBuckets("WHERE channel = 'sms' AND COALESCE(metadata->>'provider', '') = 'whatsapp'", [], db)
    : await statusBuckets("WHERE channel = 'sms'", [], db);

  const cohortConfigIssuesResult = await db.query(
    `
      SELECT
        c.id::int AS cohort_id,
        c.name AS cohort_name,
        'Open cohort without application form assignment'::text AS issue
      FROM cohorts c
      WHERE c.allow_applications = TRUE
        AND c.status <> 'cancelled'
        AND c.deleted_at IS NULL
        AND c.application_form_id IS NULL
      ORDER BY c.id DESC
    `,
  );

  const summary = await getGeneralApplySummary(db);
  const conversion = await getConversionMetrics(applicationsHasCreatedUserId, db);

  const capacityAlertsResult = await db.query(
    `
      SELECT
        c.id::int AS cohort_id,
        c.name AS cohort_name,
        COALESCE(e.enrolled, 0)::int AS enrolled,
        c.capacity::int AS capacity
      FROM cohorts c
      LEFT JOIN (
        SELECT cohort_id, COUNT(*)::int AS enrolled
        FROM enrollments
        WHERE status IN ('active', 'paused')
        GROUP BY cohort_id
      ) e ON e.cohort_id = c.id
      WHERE c.deleted_at IS NULL
        AND c.capacity IS NOT NULL
        AND c.capacity > 0
        AND COALESCE(e.enrolled, 0)::numeric / c.capacity::numeric >= 0.8
      ORDER BY (COALESCE(e.enrolled, 0)::numeric / c.capacity::numeric) DESC, c.id DESC
    `,
  );

  const activityFeedResult = await db.query(
    `
      SELECT
        id::int AS id,
        action AS type,
        message AS text,
        created_at,
        metadata
      FROM activity_logs
      ORDER BY created_at DESC, id DESC
      LIMIT 25
    `,
  );

  let superAdmin = undefined;
  if (includeSuperAdmin) {
    const adminsResult = await db.query(
      `
        SELECT
          u.id::int AS user_id,
          COALESCE(ap.full_name, u.email, 'Admin') AS name,
          COALESCE(ap.admin_role, 'admin') AS role,
          u.is_active,
          u.last_login_at
        FROM users u
        LEFT JOIN admin_profiles ap ON ap.user_id = u.id
        WHERE u.is_admin = TRUE
        ORDER BY COALESCE(ap.sort_order, 0) ASC, u.id ASC
      `,
    );
    superAdmin = {
      admins: adminsResult.rows,
    };
  }

  return {
    pipelineHealth: {
      newApplications: countValue(newApplicationsResult),
      reviewingOver3Days: countValue(reviewingOver3DaysResult),
      invitedNoInterviewConfirm: countValue(invitedNoInterviewConfirmResult),
      interviewDoneNoDecision: countValue(interviewDoneNoDecisionResult),
      acceptedNoParticipation: countValue(acceptedNoParticipationResult),
      confirmedNoUser,
    },
    interviews: {
      today: countValue(todayResult),
      upcoming: countValue(upcomingResult),
      pendingConfirmations: countValue(pendingConfirmationsResult),
      rescheduleRequests: countValue(rescheduleRequestsResult),
      confirmRate,
    },
    onboardingGaps: {
      accepted: countValue(acceptedResult),
      participationConfirmed: countValue(participationConfirmedResult),
      userCreated,
      enrollmentCreated: countValue(enrollmentCreatedResult),
    },
    messagingHealth: {
      email: emailStats,
      whatsapp: whatsappStats,
    },
    cohortConfigIssues: cohortConfigIssuesResult.rows,
    generalApplySummary: summary,
    conversion,
    capacityAlerts: capacityAlertsResult.rows,
    activityFeed: activityFeedResult.rows,
    ...(superAdmin ? { superAdmin } : {}),
  };
}

export async function listFailedMessagesForOverviewRetry(channel, limit = 50, db = pool) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const applicationMessagesHasMetadata = await columnExists("application_messages", "metadata", db);

  if (channel === "email") {
    return db.query(
      `
        SELECT
          id::int AS id,
          application_id::int AS application_id,
          program_application_id::int AS program_application_id,
          channel,
          to_value
        FROM application_messages
        WHERE status = 'failed'
          AND channel = 'email'
        ORDER BY created_at ASC, id ASC
        LIMIT $1
      `,
      [safeLimit],
    );
  }

  if (applicationMessagesHasMetadata) {
    return db.query(
      `
        SELECT
          id::int AS id,
          application_id::int AS application_id,
          program_application_id::int AS program_application_id,
          channel,
          to_value
        FROM application_messages
        WHERE status = 'failed'
          AND channel = 'sms'
          AND COALESCE(metadata->>'provider', '') = 'whatsapp'
        ORDER BY created_at ASC, id ASC
        LIMIT $1
      `,
      [safeLimit],
    );
  }

  return db.query(
    `
      SELECT
        id::int AS id,
        application_id::int AS application_id,
        program_application_id::int AS program_application_id,
        channel,
        to_value
      FROM application_messages
      WHERE status = 'failed'
        AND channel = 'sms'
      ORDER BY created_at ASC, id ASC
      LIMIT $1
    `,
    [safeLimit],
  );
}
