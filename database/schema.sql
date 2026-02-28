-- Digital Hub schema (PostgreSQL / Neon)
-- Safe to run multiple times (IF NOT EXISTS used where possible)

BEGIN;

-- =========================
-- 1) USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  password_hash TEXT NOT NULL,

  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  is_instructor BOOLEAN NOT NULL DEFAULT FALSE,
  is_student    BOOLEAN NOT NULL DEFAULT FALSE,

  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_or_phone_chk CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- =========================
-- 2) PROFILES
-- =========================
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id       BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,

  linkedin_url  TEXT,
  github_url    TEXT,
  portfolio_url TEXT,

  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  featured_rank INTEGER,
  public_slug   TEXT UNIQUE,

  -- NEW: career status fields
  is_graduated    BOOLEAN NOT NULL DEFAULT FALSE,
  is_working      BOOLEAN NOT NULL DEFAULT FALSE,
  open_to_work    BOOLEAN NOT NULL DEFAULT FALSE,
  company_work_for TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_featured
  ON student_profiles (featured);

CREATE INDEX IF NOT EXISTS idx_student_profiles_featured_rank
  ON student_profiles (featured_rank);

CREATE TABLE IF NOT EXISTS instructor_profiles (
  user_id       BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  expertise     TEXT,

  linkedin_url  TEXT,
  github_url    TEXT,
  portfolio_url TEXT,

  is_public     BOOLEAN NOT NULL DEFAULT FALSE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UPDATED: admin_profiles (replaces manager_profiles)
CREATE TABLE IF NOT EXISTS admin_profiles (
  user_id       BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  job_title     TEXT,

  linkedin_url  TEXT,
  github_url    TEXT,
  portfolio_url TEXT,

  -- NEW
  admin_role    TEXT NOT NULL DEFAULT 'admin'
    CHECK (admin_role IN ('admin','super_admin')),

  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_public_sort
  ON admin_profiles (is_public, sort_order);

-- =========================
-- 3) PROJECTS (NEW, simplified)
-- =========================
CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort_id BIGINT,

  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  github_url TEXT,
  live_url TEXT,

  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT projects_unique_student_github UNIQUE (student_user_id, github_url)
);

CREATE INDEX IF NOT EXISTS idx_projects_student_user_id ON projects(student_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_cohort_id ON projects(cohort_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);

-- =========================
-- 4) SITE CMS
-- =========================
CREATE TABLE IF NOT EXISTS site_settings (
  id                     SMALLINT PRIMARY KEY DEFAULT 1,
  site_name              TEXT NOT NULL DEFAULT 'Digital Hub',
  default_event_location TEXT NOT NULL DEFAULT 'Digital Hub',
  contact_info           JSONB NOT NULL DEFAULT '{}'::jsonb,
  social_links           JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by             BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS theme_tokens (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  purpose    TEXT NOT NULL,
  value      TEXT NOT NULL,
  scope      TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','web','admin')),
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pages (
  id           BIGSERIAL PRIMARY KEY,
  key          TEXT NOT NULL UNIQUE,
  title        TEXT,
  content      JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS home_sections (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  title      TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_sections_enabled_order
  ON home_sections (is_enabled, sort_order);

-- =========================
-- 5) PROGRAMS + COHORTS
-- =========================
CREATE TABLE IF NOT EXISTS programs (
  id               BIGSERIAL PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  summary          TEXT,
  description      TEXT,
  requirements     TEXT,
  default_capacity INTEGER CHECK (default_capacity IS NULL OR default_capacity >= 0),
  is_published     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cohorts (
  id                 BIGSERIAL PRIMARY KEY,
  program_id          BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,

  status             TEXT NOT NULL DEFAULT 'coming_soon'
    CHECK (status IN ('planned','coming_soon','open','running','completed','cancelled')),

  allow_applications BOOLEAN NOT NULL DEFAULT FALSE,
  use_general_form   BOOLEAN NOT NULL DEFAULT TRUE,
  application_form_id BIGINT,
  capacity           INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  enrollment_open_at TIMESTAMPTZ,
  enrollment_close_at TIMESTAMPTZ,

  start_date         DATE,
  end_date           DATE,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cohorts_program ON cohorts (program_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_status ON cohorts (status);
CREATE INDEX IF NOT EXISTS idx_cohorts_form_id ON cohorts (application_form_id);
CREATE INDEX IF NOT EXISTS idx_programs_deleted_at ON programs (deleted_at);
CREATE INDEX IF NOT EXISTS idx_cohorts_deleted_at ON cohorts (deleted_at);

CREATE TABLE IF NOT EXISTS cohort_instructors (
  cohort_id          BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  instructor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort_role        TEXT NOT NULL DEFAULT 'instructor',
  PRIMARY KEY (cohort_id, instructor_user_id)
);

-- =========================
-- 6) EVENTS
-- =========================
CREATE TABLE IF NOT EXISTS events (
  id           BIGSERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT,
  location     TEXT,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,

  is_done      BOOLEAN NOT NULL DEFAULT FALSE,
  done_at      TIMESTAMPTZ,

  created_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events (starts_at);
CREATE INDEX IF NOT EXISTS idx_events_published ON events (is_published);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events (deleted_at);

-- =========================
-- 7) FORMS
-- =========================
CREATE TABLE IF NOT EXISTS forms (
  id          BIGSERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  title       TEXT,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_fields (
  id          BIGSERIAL PRIMARY KEY,
  form_id     BIGINT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  label       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('text','textarea','email','phone','select','checkbox','date','file')),
  required    BOOLEAN NOT NULL DEFAULT FALSE,
  options     JSONB,
  placeholder TEXT,
  min_length  INTEGER,
  max_length  INTEGER,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (form_id, name)
);

CREATE INDEX IF NOT EXISTS idx_form_fields_form_order ON form_fields (form_id, sort_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cohorts_application_form_fk'
      AND conrelid = 'cohorts'::regclass
  ) THEN
    ALTER TABLE cohorts
      ADD CONSTRAINT cohorts_application_form_fk
      FOREIGN KEY (application_form_id)
      REFERENCES forms(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =========================
-- 8) APPLICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS applicants (
  id         BIGSERIAL PRIMARY KEY,
  full_name  TEXT,
  email      TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants (email);
CREATE INDEX IF NOT EXISTS idx_applicants_phone ON applicants (phone);

-- Program-level applications (legacy/compatibility for older admissions flows).
CREATE TABLE IF NOT EXISTS program_applications (
  id                  BIGSERIAL PRIMARY KEY,
  program_id          BIGINT NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  cohort_id           BIGINT REFERENCES cohorts(id) ON DELETE SET NULL,
  applicant_id        BIGINT REFERENCES applicants(id) ON DELETE SET NULL,
  applicant_email_norm TEXT,
  applicant_phone_norm TEXT,
  submission_answers  JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage               TEXT NOT NULL DEFAULT 'applied'
    CHECK (stage IN (
      'applied',
      'reviewing',
      'invited_to_interview',
      'interview_confirmed',
      'accepted',
      'rejected',
      'participation_confirmed'
    )),
  reviewed_by         BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  review_message      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS program_applications_unique_program_email_norm
ON program_applications (program_id, applicant_email_norm)
WHERE applicant_email_norm IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS program_applications_unique_program_phone_norm
ON program_applications (program_id, applicant_phone_norm)
WHERE applicant_phone_norm IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_program_applications_program_stage
  ON program_applications (program_id, stage);
CREATE INDEX IF NOT EXISTS idx_program_applications_cohort_id
  ON program_applications (cohort_id);
CREATE INDEX IF NOT EXISTS idx_program_applications_created_at
  ON program_applications (created_at);

CREATE TABLE IF NOT EXISTS applications (
  id           BIGSERIAL PRIMARY KEY,
  cohort_id     BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  applicant_id  BIGINT REFERENCES applicants(id) ON DELETE SET NULL,
  applicant_email_norm TEXT,
  applicant_phone_norm TEXT,
  submission_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage        TEXT NOT NULL DEFAULT 'applied'
    CHECK (stage IN (
      'applied',
      'reviewing',
      'invited_to_interview',
      'interview_confirmed',
      'accepted',
      'rejected',
      'participation_confirmed'
    )),

  status       TEXT NOT NULL DEFAULT 'applied'
    CHECK (status IN (
      'applied',
      'reviewing',
      'invited_to_interview',
      'interview_confirmed',
      'accepted',
      'rejected',
      'participation_confirmed'
    )),

  reviewed_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  review_message TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  participation_confirmed_at TIMESTAMPTZ,
  participation_note TEXT,
  user_created_at TIMESTAMPTZ,
  created_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  participation_token TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_applications_cohort_status ON applications (cohort_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications (stage);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications (submitted_at);
CREATE INDEX IF NOT EXISTS idx_applications_created_user_id ON applications (created_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS applications_unique_cohort_email_norm
ON applications (cohort_id, applicant_email_norm)
WHERE applicant_email_norm IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS applications_unique_cohort_phone_norm
ON applications (cohort_id, applicant_phone_norm)
WHERE applicant_phone_norm IS NOT NULL;

CREATE TABLE IF NOT EXISTS application_submissions (
  id             BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  form_id        BIGINT NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
  answers        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Interview scheduling flow for applications.
CREATE TABLE IF NOT EXISTS interviews (
  id                      BIGSERIAL PRIMARY KEY,
  application_id          BIGINT UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  program_application_id  BIGINT REFERENCES program_applications(id) ON DELETE CASCADE,
  scheduled_at            TIMESTAMPTZ,
  duration_minutes        INTEGER NOT NULL DEFAULT 30,
  location_type           TEXT NOT NULL DEFAULT 'online',
  location_details        TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending_confirmation',
  applicant_response_note TEXT,
  requested_at            TIMESTAMPTZ,
  confirmed_at            TIMESTAMPTZ,
  confirm_token           TEXT UNIQUE,
  created_by              BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interviews_location_type_check CHECK (location_type IN ('online', 'in_person', 'phone')),
  CONSTRAINT interviews_status_check CHECK (
    status IN ('pending_confirmation', 'confirmed', 'reschedule_requested', 'cancelled', 'completed')
  )
);

CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews (application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_program_app ON interviews (program_application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews (status);
CREATE INDEX IF NOT EXISTS idx_interviews_token ON interviews (confirm_token);

-- Draft/sent communication history for applications.
CREATE TABLE IF NOT EXISTS application_messages (
  id                    BIGSERIAL PRIMARY KEY,
  application_id        BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  program_application_id BIGINT REFERENCES program_applications(id) ON DELETE CASCADE,
  channel               TEXT NOT NULL,
  to_value              TEXT NOT NULL,
  subject               TEXT,
  body                  TEXT NOT NULL,
  template_key          TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                TEXT NOT NULL DEFAULT 'draft',
  sent_at               TIMESTAMPTZ,
  created_by            BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT application_messages_channel_check CHECK (channel IN ('email', 'sms')),
  CONSTRAINT application_messages_status_check CHECK (status IN ('draft', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_application_messages_application ON application_messages (application_id);
CREATE INDEX IF NOT EXISTS idx_application_messages_program_app ON application_messages (program_application_id);
CREATE INDEX IF NOT EXISTS idx_application_messages_status ON application_messages (status);
CREATE INDEX IF NOT EXISTS idx_application_messages_provider ON application_messages ((metadata->>'provider'));

-- =========================
-- 9) ENROLLMENTS
-- =========================
CREATE TABLE IF NOT EXISTS enrollments (
  id              BIGSERIAL PRIMARY KEY,
  student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort_id       BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  application_id  BIGINT UNIQUE REFERENCES applications(id) ON DELETE SET NULL,

  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','dropped')),

  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (student_user_id, cohort_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_cohort ON enrollments (cohort_id);

-- =========================
-- 10) ANNOUNCEMENTS
-- =========================
CREATE TABLE IF NOT EXISTS announcements (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,

  target_audience TEXT NOT NULL DEFAULT 'all'
    CHECK (target_audience IN ('all','website','admin')),

  cohort_id        BIGINT REFERENCES cohorts(id) ON DELETE CASCADE,

  is_auto         BOOLEAN NOT NULL DEFAULT FALSE,
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  publish_at      TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,

  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_audience_published
  ON announcements (target_audience, is_published, publish_at);
CREATE INDEX IF NOT EXISTS idx_announcements_deleted_at ON announcements (deleted_at);

-- =========================
-- 11) MESSAGE TEMPLATES
-- =========================
CREATE TABLE IF NOT EXISTS message_templates (
  id          BIGSERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT,
  channel     TEXT NOT NULL DEFAULT 'all'
    CHECK (channel IN ('email','sms','all')),
  subject     TEXT,
  body        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_active_order
  ON message_templates (is_active, sort_order);

-- Ensure existing databases gain compatibility columns and constraints.
ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cohort_id BIGINT;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS use_general_form BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS application_form_id BIGINT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_email_norm TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_phone_norm TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_answers JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS review_message TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS participation_confirmed_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS participation_note TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS user_created_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS created_user_id BIGINT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS participation_token TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE application_messages ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_cohort_id_fkey'
      AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_cohort_id_fkey
      FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_created_user_id_fkey'
      AND conrelid = 'applications'::regclass
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_created_user_id_fkey
      FOREIGN KEY (created_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS applications_participation_token_key
  ON applications (participation_token);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications (stage);
CREATE INDEX IF NOT EXISTS idx_applications_created_user_id ON applications (created_user_id);

ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'applied';
ALTER TABLE applications ALTER COLUMN stage SET DEFAULT 'applied';

-- Drop legacy applications status/stage checks before normalizing data.
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

UPDATE applications
SET status = CASE
  WHEN status = 'pending' THEN 'applied'
  WHEN status = 'waitlisted' THEN 'reviewing'
  WHEN status = 'approved' THEN 'accepted'
  ELSE status
END;

UPDATE applications
SET stage = CASE
  WHEN stage = 'submitted' THEN 'applied'
  WHEN stage = 'reviewed' THEN 'reviewing'
  WHEN stage = 'shortlisted' THEN 'reviewing'
  WHEN stage = 'interview_scheduled' THEN 'invited_to_interview'
  WHEN stage = 'interview_completed' THEN 'interview_confirmed'
  WHEN stage = 'user_created' THEN 'participation_confirmed'
  WHEN stage IS NULL OR stage = '' THEN CASE
    WHEN status = 'applied' THEN 'applied'
    WHEN status = 'reviewing' THEN 'reviewing'
    WHEN status = 'invited_to_interview' THEN 'invited_to_interview'
    WHEN status = 'interview_confirmed' THEN 'interview_confirmed'
    WHEN status = 'accepted' THEN 'accepted'
    WHEN status = 'rejected' THEN 'rejected'
    WHEN status = 'participation_confirmed' THEN 'participation_confirmed'
    ELSE 'applied'
  END
  ELSE stage
END;

ALTER TABLE applications ALTER COLUMN stage SET NOT NULL;

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
          'accepted',
          'rejected',
          'participation_confirmed'
        )
      );
  END IF;
END $$;

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS program_application_id BIGINT;
ALTER TABLE application_messages ADD COLUMN IF NOT EXISTS program_application_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'interviews_program_application_id_fkey'
      AND conrelid = 'interviews'::regclass
  ) THEN
    ALTER TABLE interviews
      ADD CONSTRAINT interviews_program_application_id_fkey
      FOREIGN KEY (program_application_id) REFERENCES program_applications(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'application_messages_program_application_id_fkey'
      AND conrelid = 'application_messages'::regclass
  ) THEN
    ALTER TABLE application_messages
      ADD CONSTRAINT application_messages_program_application_id_fkey
      FOREIGN KEY (program_application_id) REFERENCES program_applications(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interviews_program_app ON interviews (program_application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews (status);
CREATE INDEX IF NOT EXISTS idx_application_messages_program_app ON application_messages (program_application_id);
CREATE INDEX IF NOT EXISTS idx_application_messages_provider ON application_messages ((metadata->>'provider'));

-- =========================
-- 12) CONTACT MESSAGES
-- =========================
CREATE TABLE IF NOT EXISTS contact_messages (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,

  kind       TEXT NOT NULL DEFAULT 'question'
    CHECK (kind IN ('question','visit_request','feedback')),

  company_name          TEXT,
  company_role          TEXT,
  visit_preferred_dates TEXT,
  visit_notes           TEXT,

  status     TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','in_progress','resolved')),

  assigned_to     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  last_replied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON contact_messages (status);

-- =========================
-- 13) LOGS + ADMIN NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS activity_logs (
  id            BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,

  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     BIGINT,

  message       TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs (actor_user_id);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id                      BIGSERIAL PRIMARY KEY,
  recipient_admin_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_id                  BIGINT REFERENCES activity_logs(id) ON DELETE CASCADE,

  title                   TEXT NOT NULL,
  body                    TEXT,

  is_read                 BOOLEAN NOT NULL DEFAULT FALSE,
  read_at                 TIMESTAMPTZ,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_inbox
  ON admin_notifications (recipient_admin_user_id, is_read, created_at);

COMMIT;

---


