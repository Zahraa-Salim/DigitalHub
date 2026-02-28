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

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_public_sort
  ON admin_profiles (is_public, sort_order);

-- =========================
-- 3) PROJECTS (NEW, simplified)
-- =========================
CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

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

  status             TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','coming_soon','open','running','completed','cancelled')),

  allow_applications BOOLEAN NOT NULL DEFAULT FALSE,
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

CREATE TABLE IF NOT EXISTS applications (
  id           BIGSERIAL PRIMARY KEY,
  cohort_id     BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  applicant_id  BIGINT REFERENCES applicants(id) ON DELETE SET NULL,
  applicant_email_norm TEXT,
  applicant_phone_norm TEXT,

  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','waitlisted')),

  reviewed_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_cohort_status ON applications (cohort_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications (submitted_at);

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

-- Ensure existing databases gain soft-delete columns.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =========================
-- 11) CONTACT MESSAGES
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
-- 12) LOGS + ADMIN NOTIFICATIONS
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


