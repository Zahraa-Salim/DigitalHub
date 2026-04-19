// File: server/src/db/migrations.ts
// Purpose: Hosts idempotent startup migrations that keep the database schema aligned at boot.

import bcrypt from "bcryptjs";
import { pool } from "./index.js";
import type { DbClient } from "./index.js";

// Handles 'slugifyValue' workflow for this module.
function slugifyValue(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

// Handles 'ensureSoftDeleteColumns' workflow for this module.
async function ensureSoftDeleteColumns(client: typeof pool | DbClient) {
  await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS application_form_id BIGINT REFERENCES forms(id) ON DELETE SET NULL;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS use_general_form BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS color_scheme_id INTEGER DEFAULT 1 CHECK (color_scheme_id >= 1 AND color_scheme_id <= 6);
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS icon_class TEXT DEFAULT 'fa-code';
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS use_general_form BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS application_form_id BIGINT;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS attendance_days JSONB NOT NULL DEFAULT '["monday","tuesday","wednesday","thursday"]'::jsonb;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS attendance_start_time TIME;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS attendance_end_time TIME;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_answers JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS review_message TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS completion_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS post_body TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS featured_image_url TEXT;
      UPDATE events SET completion_image_urls = '[]'::jsonb WHERE completion_image_urls IS NULL;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS event_id BIGINT;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS cta_label TEXT;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS cta_url TEXT;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS cta_open_in_new_tab BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
      ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS skills TEXT;
      ALTER TABLE instructor_profiles ADD COLUMN IF NOT EXISTS skills TEXT;
      ALTER TABLE instructor_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      ALTER TABLE instructor_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_users_reset_password_token
        ON users (reset_password_token);
      CREATE TABLE IF NOT EXISTS media_assets (
        id BIGSERIAL PRIMARY KEY,
        file_name TEXT NOT NULL UNIQUE,
        original_name TEXT,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
        storage_path TEXT NOT NULL,
        public_url TEXT NOT NULL UNIQUE,
        alt_text TEXT,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_media_assets_created_at
        ON media_assets (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_media_assets_file_name
        ON media_assets (file_name);
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id BIGSERIAL PRIMARY KEY,
        cohort_id BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
        attendance_date DATE NOT NULL,
        location_type TEXT NOT NULL DEFAULT 'on_site',
        submitted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT attendance_sessions_location_type_check CHECK (location_type IN ('remote', 'on_site')),
        CONSTRAINT attendance_sessions_unique_cohort_day UNIQUE (cohort_id, attendance_date)
      );
      CREATE TABLE IF NOT EXISTS attendance_records (
        id BIGSERIAL PRIMARY KEY,
        session_id BIGINT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attendance_status TEXT NOT NULL DEFAULT 'present',
        note TEXT,
        marked_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT attendance_records_status_check CHECK (attendance_status IN ('present', 'absent', 'late')),
        CONSTRAINT attendance_records_unique_student_per_session UNIQUE (session_id, student_user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_attendance_sessions_cohort_date
        ON attendance_sessions (cohort_id, attendance_date DESC);
      CREATE INDEX IF NOT EXISTS idx_attendance_records_student
        ON attendance_records (student_user_id, marked_at DESC);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS admin_status TEXT;
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS dropout_reason TEXT;
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS status_updated_by BIGINT;
      UPDATE student_profiles sp
      SET admin_status = CASE
        WHEN COALESCE(NULLIF(sp.admin_status, ''), '') <> '' THEN sp.admin_status
        WHEN EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = sp.user_id
            AND u.is_active = FALSE
        ) THEN 'dropout'
        ELSE 'active'
      END
      WHERE sp.admin_status IS NULL OR sp.admin_status = '';
      ALTER TABLE student_profiles ALTER COLUMN admin_status SET DEFAULT 'active';
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'student_profiles_admin_status_check'
            AND conrelid = 'student_profiles'::regclass
        ) THEN
          ALTER TABLE student_profiles
            ADD CONSTRAINT student_profiles_admin_status_check
            CHECK (admin_status IN ('active', 'dropout'));
        END IF;
      END $$;

      -- Drop legacy/unknown applications check constraints before data normalization.
      DO $$
      DECLARE
        c RECORD;
      BEGIN
        FOR c IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'applications'::regclass
            AND contype = 'c'
            AND (
              pg_get_constraintdef(oid) ILIKE '%status%'
              OR pg_get_constraintdef(oid) ILIKE '%stage%'
            )
        LOOP
          EXECUTE format('ALTER TABLE applications DROP CONSTRAINT %I', c.conname);
        END LOOP;
      END $$;

      -- Ensure modern applications status enum values.
      UPDATE applications
      SET status = CASE
        WHEN status = 'pending' THEN 'applied'
        WHEN status = 'waitlisted' THEN 'reviewing'
        WHEN status = 'approved' THEN 'accepted'
        ELSE status
      END;

      -- Keep stage in sync when it already carries legacy pipeline labels,
      -- and backfill stage when missing.
      UPDATE applications
      SET stage = CASE
        WHEN stage = 'submitted' THEN 'applied'
        WHEN stage = 'reviewed' THEN 'reviewing'
        WHEN stage = 'shortlisted' THEN 'reviewing'
        WHEN stage = 'interview_scheduled' THEN 'invited_to_interview'
        WHEN stage = 'interview_completed' THEN 'interview_completed'
        WHEN stage = 'user_created' THEN 'participation_confirmed'
        WHEN stage IS NULL OR stage = '' THEN CASE
          WHEN status = 'applied' THEN 'applied'
          WHEN status = 'reviewing' THEN 'reviewing'
          WHEN status = 'invited_to_interview' THEN 'invited_to_interview'
          WHEN status = 'interview_confirmed' THEN 'interview_confirmed'
          WHEN status = 'interview_completed' THEN 'interview_completed'
          WHEN status = 'accepted' THEN 'accepted'
          WHEN status = 'rejected' THEN 'rejected'
          WHEN status = 'participation_confirmed' THEN 'participation_confirmed'
          ELSE 'applied'
        END
        ELSE stage
      END;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'applications_status_check'
            AND conrelid = 'applications'::regclass
        ) THEN
          ALTER TABLE applications
            ADD CONSTRAINT applications_status_check
            CHECK (
              status IN (
                'applied',
                'reviewing',
                'invited_to_interview',
                'interview_confirmed',
                'interview_completed',
                'accepted',
                'rejected',
                'participation_confirmed'
              )
            );
        END IF;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'applications_stage_check'
            AND conrelid = 'applications'::regclass
        ) THEN
          ALTER TABLE applications
            ADD CONSTRAINT applications_stage_check
            CHECK (
              stage IN (
                'applied',
                'reviewing',
                'invited_to_interview',
                'interview_confirmed',
                'interview_completed',
                'accepted',
                'rejected',
                'participation_confirmed'
              )
            );
        END IF;
      END $$;

      UPDATE cohorts
      SET status = 'coming_soon', updated_at = NOW()
      WHERE status = 'planned'
        AND deleted_at IS NULL;

      ALTER TABLE IF EXISTS cohorts
        ADD COLUMN IF NOT EXISTS auto_announce BOOLEAN NOT NULL DEFAULT FALSE;

      ALTER TABLE IF EXISTS events
        ADD COLUMN IF NOT EXISTS auto_announce BOOLEAN NOT NULL DEFAULT FALSE;

      DO $$
      BEGIN
        ALTER TABLE form_fields DROP CONSTRAINT IF EXISTS form_fields_type_check;
        ALTER TABLE form_fields ADD CONSTRAINT form_fields_type_check
          CHECK (type IN (
            'text', 'textarea', 'email', 'phone', 'select',
            'checkbox', 'radio', 'date', 'file', 'number', 'url'
          ));
      EXCEPTION WHEN others THEN
        NULL;
      END $$;

      ALTER TABLE application_messages ADD COLUMN IF NOT EXISTS body_html TEXT;
      ALTER TABLE application_messages ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS body_html TEXT;
      ALTER TABLE IF EXISTS theme_tokens
        ADD COLUMN IF NOT EXISTS color_history JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
}

// Handles 'ensureDefaultThemeTokens' workflow for this module.
async function ensureDefaultThemeTokens(client: typeof pool | DbClient) {
  await client.query(`
      INSERT INTO theme_tokens (key, purpose, value, scope, updated_at)
      VALUES
        ('--tg-theme-primary', 'Main brand blue', '#0255E0', 'web', NOW()),
        ('--tg-heading-color', 'Dark heading', '#161439', 'web', NOW()),
        ('--tg-body-color', 'Body text', '#6D6C80', 'web', NOW()),
        ('--tg-common-color-cyan', 'Aqua accent', '#00AEE5', 'web', NOW()),
        ('--tg-common-color-black-2', 'Electric blue', '#0255E0', 'web', NOW()),
        ('--tg-common-color-dark', 'Dark navy', '#1C1A4A', 'web', NOW()),
        ('--tg-theme-secondary', 'Secondary background', '#ffffff', 'web', NOW())
      ON CONFLICT (key) DO NOTHING
    `);
}

// Handles 'ensureAboutPageBannerTitle' workflow for this module.
async function ensureAboutPageBannerTitle(client: typeof pool | DbClient) {
  await client.query(`
      UPDATE pages
      SET content = content
        || jsonb_build_object(
             'banner_title', COALESCE(content->>'banner_title', 'Build skills. Become employable.'),
             'banner_subtitle', COALESCE(content->>'banner_subtitle', 'About Us')
           )
      WHERE key = 'about'
        AND (
          content->>'banner_title' IS NULL
          OR content->>'banner_subtitle' IS NULL
        )
    `);
}

// Handles 'ensureSubscribersTable' workflow for this module.
async function ensureSubscribersTable(client: typeof pool | DbClient) {
  await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id             SERIAL PRIMARY KEY,
        phone          TEXT NOT NULL,
        name           TEXT,
        preferences    TEXT[] NOT NULL DEFAULT '{}',
        is_active      BOOLEAN NOT NULL DEFAULT TRUE,
        opted_out_at   TIMESTAMPTZ,
        source         TEXT NOT NULL DEFAULT 'website',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS subscribers_phone_unique ON subscribers (phone)
    `);
  await client.query(`
      CREATE TABLE IF NOT EXISTS subscriber_messages (
        id              SERIAL PRIMARY KEY,
        subscriber_id   INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
        announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
        sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (subscriber_id, announcement_id)
      )
    `);
}

// Handles 'ensureStudentProfileUserLinks' workflow for this module.
async function ensureStudentProfileUserLinks(client: typeof pool | DbClient) {
  const orphanProfilesResult = await client.query(`
      SELECT
        sp.ctid::text AS row_ref,
        sp.full_name,
        sp.public_slug
      FROM student_profiles sp
      LEFT JOIN users u ON u.id = sp.user_id
      WHERE sp.user_id IS NULL OR u.id IS NULL
    `);
  if (!orphanProfilesResult.rowCount) {
    return;
  }

  const placeholderHash = await bcrypt.hash("ChangeMe123!", 10);
  for (let index = 0; index < orphanProfilesResult.rows.length; index += 1) {
    const row = orphanProfilesResult.rows[index];
    const baseSlug = slugifyValue(row.public_slug || row.full_name || `student-${index + 1}`) || `student-${index + 1}`;
    const userResult = await client.query(
      `
          INSERT INTO users (
            email,
            password_hash,
            is_student,
            is_active,
            created_at,
            updated_at
          )
          VALUES ($1, $2, TRUE, TRUE, NOW(), NOW())
          RETURNING id
        `,
      [`${baseSlug}-${Date.now()}-${index + 1}@digitalhub.local`, placeholderHash],
    );
    const userId = Number(userResult.rows[0]?.id);
    const generatedSlug = row.public_slug
      ? slugifyValue(row.public_slug)
      : `${baseSlug}-${userId}`;
    await client.query(
      `
          UPDATE student_profiles
          SET user_id = $1,
              public_slug = COALESCE(NULLIF(public_slug, ''), $2)
          WHERE ctid = $3::tid
        `,
      [userId, generatedSlug, row.row_ref],
    );
  }
}

// Handles 'runStartupMigrations' workflow for this module.
export async function runStartupMigrations(client: typeof pool | DbClient = pool) {
  await ensureSoftDeleteColumns(client);
  await ensureDefaultThemeTokens(client);
  await ensureAboutPageBannerTitle(client);
  await ensureSubscribersTable(client);
  await ensureStudentProfileUserLinks(client);
}
