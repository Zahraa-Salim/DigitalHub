-- Digital Hub schema (PostgreSQL / Neon)
-- Paste this into Neon SQL Editor and run.
-- Safe to run multiple times because it uses IF NOT EXISTS where possible.

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

CREATE TABLE IF NOT EXISTS manager_profiles (
  user_id       BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  bio           TEXT,
  job_title     TEXT,

  linkedin_url  TEXT,
  github_url    TEXT,
  portfolio_url TEXT,

  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_profiles_public_sort
  ON manager_profiles (is_public, sort_order);

-- =========================
-- 3) SITE CMS
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

-- Ensure single row exists (id=1)
INSERT INTO site_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS theme_tokens (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE, -- CSS variable name, e.g. --bg
  purpose    TEXT NOT NULL,        -- human meaning, e.g. Background
  value      TEXT NOT NULL,        -- e.g. #0b0f19
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
-- 4) PROGRAMS (templates) + COHORTS (real runs)
-- =========================
CREATE TABLE IF NOT EXISTS programs (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  summary         TEXT,
  description     TEXT,
  requirements    TEXT,
  default_capacity INTEGER CHECK (default_capacity IS NULL OR default_capacity >= 0),
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_program
  ON cohorts (program_id);

CREATE INDEX IF NOT EXISTS idx_cohorts_status
  ON cohorts (status);

CREATE TABLE IF NOT EXISTS cohort_instructors (
  cohort_id          BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  instructor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort_role        TEXT NOT NULL DEFAULT 'instructor',
  PRIMARY KEY (cohort_id, instructor_user_id)
);

-- =========================
-- 5) EVENTS
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
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_starts_at
  ON events (starts_at);

CREATE INDEX IF NOT EXISTS idx_events_published
  ON events (is_published);

-- =========================
-- 6) FORMS (dynamic)
-- =========================
CREATE TABLE IF NOT EXISTS forms (
  id          BIGSERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE, -- e.g. cohort_application, contact
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

CREATE INDEX IF NOT EXISTS idx_form_fields_form_order
  ON form_fields (form_id, sort_order);

-- =========================
-- 7) APPLICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS applicants (
  id         BIGSERIAL PRIMARY KEY,
  full_name  TEXT,
  email      TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applicants_email
  ON applicants (email);

CREATE INDEX IF NOT EXISTS idx_applicants_phone
  ON applicants (phone);

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

CREATE INDEX IF NOT EXISTS idx_applications_cohort_status
  ON applications (cohort_id, status);

CREATE INDEX IF NOT EXISTS idx_applications_submitted_at
  ON applications (submitted_at);

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
-- 8) ENROLLMENTS
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

CREATE INDEX IF NOT EXISTS idx_enrollments_cohort
  ON enrollments (cohort_id);

-- =========================
-- 9) ANNOUNCEMENTS
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

  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_audience_published
  ON announcements (target_audience, is_published, publish_at);

-- =========================
-- 10) CONTACT MESSAGES
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

  company_name         TEXT,
  company_role         TEXT,
  visit_preferred_dates TEXT,
  visit_notes          TEXT,

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
-- 11) LOGS + ADMIN NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS activity_logs (
  id            BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,

  action        TEXT NOT NULL,   -- e.g. COHORT_CREATED
  entity_type   TEXT NOT NULL,   -- e.g. cohort, application, user
  entity_id     BIGINT,

  message       TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON activity_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor
  ON activity_logs (actor_user_id);

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







--


















----


















---













--

-- Insertion
-- seed.sql — Digital Hub demo data (Neon / PostgreSQL)
-- Paste into Neon SQL Editor AFTER you created the schema tables.
-- This is "safe-ish" to re-run: uses ON CONFLICT where possible.

BEGIN;

-- =========================================================
-- 0) Optional: enable pgcrypto for bcrypt hashing in SQL
--    (Neon usually supports pgcrypto. If this fails, skip it
--     and manually set password_hash from your Node seed script.)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1) USERS (admin + instructor + student demo)
-- =========================================================
-- Admin (login demo)
INSERT INTO users (email, password_hash, is_admin, is_active)
VALUES (
  'admin@digitalhub.com',
  crypt('ChangeMe123!', gen_salt('bf', 10)),
  TRUE,
  TRUE
)
ON CONFLICT (email) DO UPDATE
SET is_admin = TRUE, is_active = TRUE
RETURNING id;

-- Instructor user
INSERT INTO users (email, password_hash, is_instructor, is_active)
VALUES (
  'instructor@digitalhub.com',
  crypt('ChangeMe123!', gen_salt('bf', 10)),
  TRUE,
  TRUE
)
ON CONFLICT (email) DO UPDATE
SET is_instructor = TRUE, is_active = TRUE
RETURNING id;

-- Student user (optional demo)
INSERT INTO users (email, password_hash, is_student, is_active)
VALUES (
  'student@digitalhub.com',
  crypt('ChangeMe123!', gen_salt('bf', 10)),
  TRUE,
  TRUE
)
ON CONFLICT (email) DO UPDATE
SET is_student = TRUE, is_active = TRUE
RETURNING id;

-- Convenience selectors
-- (Use these in subqueries below)
-- admin id:
--   (SELECT id FROM users WHERE email='admin@digitalhub.com')
-- instructor id:
--   (SELECT id FROM users WHERE email='instructor@digitalhub.com')
-- student id:
--   (SELECT id FROM users WHERE email='student@digitalhub.com')

-- =========================================================
-- 2) PROFILES
-- =========================================================
-- Instructor profile (public)
INSERT INTO instructor_profiles (
  user_id, full_name, avatar_url, bio, expertise,
  linkedin_url, github_url, portfolio_url, is_public
)
VALUES (
  (SELECT id FROM users WHERE email='instructor@digitalhub.com'),
  'Rami Haddad',
  NULL,
  'Full-stack engineer and mentor focused on employability and project-based learning.',
  'React, Node.js, PostgreSQL, API Design',
  'https://www.linkedin.com/in/rami-haddad',
  'https://github.com/rami-haddad',
  NULL,
  TRUE
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name=EXCLUDED.full_name,
  bio=EXCLUDED.bio,
  expertise=EXCLUDED.expertise,
  is_public=EXCLUDED.is_public;

-- Student profile (public + featured)
INSERT INTO student_profiles (
  user_id, full_name, avatar_url, bio,
  linkedin_url, github_url, portfolio_url,
  is_public, featured, featured_rank, public_slug
)
VALUES (
  (SELECT id FROM users WHERE email='student@digitalhub.com'),
  'Zahraa Salim',
  NULL,
  'Junior developer focused on building real projects and becoming job-ready.',
  NULL,
  'https://github.com/zahraa-salim',
  NULL,
  TRUE,
  TRUE,
  1,
  'zahraa-salim'
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name=EXCLUDED.full_name,
  bio=EXCLUDED.bio,
  is_public=EXCLUDED.is_public,
  featured=EXCLUDED.featured,
  featured_rank=EXCLUDED.featured_rank,
  public_slug=EXCLUDED.public_slug;

-- Manager profile (admin shown publicly)
INSERT INTO manager_profiles (
  user_id, full_name, avatar_url, bio, job_title,
  linkedin_url, github_url, portfolio_url,
  is_public, sort_order
)
VALUES (
  (SELECT id FROM users WHERE email='admin@digitalhub.com'),
  'Digital Hub Admin',
  NULL,
  'Program manager supporting learners and partners to build real-world skills and employability.',
  'Program Manager',
  NULL,
  NULL,
  NULL,
  TRUE,
  1
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name=EXCLUDED.full_name,
  bio=EXCLUDED.bio,
  job_title=EXCLUDED.job_title,
  is_public=EXCLUDED.is_public,
  sort_order=EXCLUDED.sort_order;

-- =========================================================
-- 3) SITE SETTINGS (one row)
-- =========================================================
INSERT INTO site_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

UPDATE site_settings
SET
  site_name='Digital Hub',
  default_event_location='Digital Hub',
  contact_info = jsonb_build_object(
    'email', 'hello@digitalhub.com',
    'phone', '+961-00-000-000',
    'address', 'Beirut, Lebanon'
  ),
  social_links = jsonb_build_object(
    'instagram', 'https://instagram.com/digitalhub',
    'linkedin', 'https://linkedin.com/company/digitalhub'
  ),
  updated_by = (SELECT id FROM users WHERE email='admin@digitalhub.com'),
  updated_at = NOW()
WHERE id=1;

-- =========================================================
-- 4) THEME TOKENS (CSS variables)
-- =========================================================
INSERT INTO theme_tokens (key, purpose, value, scope, updated_by)
VALUES
  ('--bg', 'Background', '#0B0F19', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com')),
  ('--text', 'Text', '#E6EAF2', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com')),
  ('--primary', 'Primary', '#6D5EF7', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com')),
  ('--card', 'Card Background', '#121A2A', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com')),
  ('--border', 'Border', '#22304D', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com'))
ON CONFLICT (key) DO UPDATE SET
  purpose=EXCLUDED.purpose,
  value=EXCLUDED.value,
  scope=EXCLUDED.scope,
  updated_by=EXCLUDED.updated_by,
  updated_at=NOW();

-- =========================================================
-- 5) PAGES (DB-driven)
-- =========================================================
INSERT INTO pages (key, title, content, is_published, updated_by)
VALUES
  ('about', 'About Digital Hub',
    jsonb_build_object(
      'heroTitle', 'Build skills. Become employable.',
      'heroSubtitle', 'We help learners become job-ready through structured programs, real projects, and community.'
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  ),
  ('privacy', 'Privacy Policy',
    jsonb_build_object(
      'text', 'This is a demo privacy policy. Replace with your official policy.'
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  )
ON CONFLICT (key) DO UPDATE SET
  title=EXCLUDED.title,
  content=EXCLUDED.content,
  is_published=EXCLUDED.is_published,
  updated_by=EXCLUDED.updated_by,
  updated_at=NOW();

-- =========================================================
-- 6) HOME SECTIONS (enabled + ordered)
-- =========================================================
INSERT INTO home_sections (key, title, is_enabled, sort_order, content, updated_by)
VALUES
  ('hero', 'Hero', TRUE, 1,
    jsonb_build_object(
      'headline', 'Your career starts here',
      'subheadline', 'Programs designed to build skills and employability.',
      'ctaText', 'Explore Programs',
      'ctaLink', '/programs'
    ),
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  ),
  ('programs', 'Programs', TRUE, 2,
    jsonb_build_object('style', 'grid', 'limit', 6),
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  ),
  ('featured_students', 'Featured Students', TRUE, 3,
    jsonb_build_object('limit', 6),
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  ),
  ('announcements', 'Announcements', TRUE, 4,
    jsonb_build_object('limit', 3),
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  )
ON CONFLICT (key) DO UPDATE SET
  title=EXCLUDED.title,
  is_enabled=EXCLUDED.is_enabled,
  sort_order=EXCLUDED.sort_order,
  content=EXCLUDED.content,
  updated_by=EXCLUDED.updated_by,
  updated_at=NOW();

-- =========================================================
-- 7) FORMS + FIELDS
-- =========================================================
-- Forms
INSERT INTO forms (key, title, description, is_active, created_by)
VALUES
  ('cohort_application', 'Cohort Application', 'Apply to join a cohort.', TRUE, (SELECT id FROM users WHERE email='admin@digitalhub.com')),
  ('contact', 'Contact Form', 'Send a question, feedback, or a visit request.', TRUE, (SELECT id FROM users WHERE email='admin@digitalhub.com'))
ON CONFLICT (key) DO UPDATE SET
  title=EXCLUDED.title,
  description=EXCLUDED.description,
  is_active=EXCLUDED.is_active,
  created_by=EXCLUDED.created_by,
  updated_at=NOW();

-- Cohort application fields (minimal demo)
INSERT INTO form_fields (form_id, name, label, type, required, options, placeholder, sort_order, is_enabled)
VALUES
  ((SELECT id FROM forms WHERE key='cohort_application'), 'full_name', 'Full Name', 'text', TRUE, NULL, 'Your name', 1, TRUE),
  ((SELECT id FROM forms WHERE key='cohort_application'), 'email', 'Email', 'email', TRUE, NULL, 'you@example.com', 2, TRUE),
  ((SELECT id FROM forms WHERE key='cohort_application'), 'phone', 'Phone', 'phone', FALSE, NULL, '+961...', 3, TRUE),
  ((SELECT id FROM forms WHERE key='cohort_application'), 'why_join', 'Why do you want to join?', 'textarea', TRUE, NULL, 'Tell us your goals...', 4, TRUE)
ON CONFLICT (form_id, name) DO UPDATE SET
  label=EXCLUDED.label,
  type=EXCLUDED.type,
  required=EXCLUDED.required,
  options=EXCLUDED.options,
  placeholder=EXCLUDED.placeholder,
  sort_order=EXCLUDED.sort_order,
  is_enabled=EXCLUDED.is_enabled;

-- Contact fields (demo)
INSERT INTO form_fields (form_id, name, label, type, required, options, placeholder, sort_order, is_enabled)
VALUES
  ((SELECT id FROM forms WHERE key='contact'), 'name', 'Name', 'text', TRUE, NULL, 'Your name', 1, TRUE),
  ((SELECT id FROM forms WHERE key='contact'), 'email', 'Email', 'email', TRUE, NULL, 'you@example.com', 2, TRUE),
  ((SELECT id FROM forms WHERE key='contact'), 'kind', 'Message Type', 'select', TRUE,
    jsonb_build_object('choices', jsonb_build_array('question','feedback','visit_request')),
    NULL, 3, TRUE),
  ((SELECT id FROM forms WHERE key='contact'), 'message', 'Message', 'textarea', TRUE, NULL, 'Write your message...', 4, TRUE)
ON CONFLICT (form_id, name) DO UPDATE SET
  label=EXCLUDED.label,
  type=EXCLUDED.type,
  required=EXCLUDED.required,
  options=EXCLUDED.options,
  placeholder=EXCLUDED.placeholder,
  sort_order=EXCLUDED.sort_order,
  is_enabled=EXCLUDED.is_enabled;

-- =========================================================
-- 8) PROGRAMS + COHORTS + COHORT INSTRUCTORS
-- =========================================================
-- Programs (templates)
INSERT INTO programs (slug, title, summary, description, requirements, default_capacity, is_published, created_by)
VALUES
  ('full-stack', 'Full Stack Development',
   'Build modern web apps with React, Node, and PostgreSQL.',
   'A job-ready program focused on real projects, teamwork, and portfolio building.',
   'Basic computer skills and motivation to learn.',
   20,
   TRUE,
   (SELECT id FROM users WHERE email='admin@digitalhub.com')
  ),
  ('ui-ux', 'UI/UX Design',
   'Learn design thinking and build real UI projects.',
   'User research, wireframing, prototyping, and design systems.',
   'Creativity and basic computer skills.',
   15,
   TRUE,
   (SELECT id FROM users WHERE email='admin@digitalhub.com')
  )
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title,
  summary=EXCLUDED.summary,
  description=EXCLUDED.description,
  requirements=EXCLUDED.requirements,
  default_capacity=EXCLUDED.default_capacity,
  is_published=EXCLUDED.is_published,
  updated_at=NOW();

-- Cohorts (real runs)
INSERT INTO cohorts (
  program_id, name, status, allow_applications, capacity,
  enrollment_open_at, enrollment_close_at, start_date, end_date
)
VALUES
  (
    (SELECT id FROM programs WHERE slug='full-stack'),
    'Full Stack — Spring 2026',
    'open',
    TRUE,
    20,
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '30 days',
    '2026-03-10',
    '2026-06-10'
  ),
  (
    (SELECT id FROM programs WHERE slug='ui-ux'),
    'UI/UX — Coming Soon',
    'coming_soon',
    FALSE,
    15,
    NULL,
    NULL,
    '2026-05-01',
    '2026-07-01'
  )
ON CONFLICT DO NOTHING;

-- Assign instructor to the open cohort
INSERT INTO cohort_instructors (cohort_id, instructor_user_id, cohort_role)
VALUES (
  (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026'),
  (SELECT id FROM users WHERE email='instructor@digitalhub.com'),
  'lead_instructor'
)
ON CONFLICT (cohort_id, instructor_user_id) DO UPDATE SET
  cohort_role=EXCLUDED.cohort_role;

-- =========================================================
-- 9) APPLICANTS + APPLICATIONS + SUBMISSIONS + ENROLLMENT
-- =========================================================
-- Applicant identity (visitor)
INSERT INTO applicants (full_name, email, phone)
VALUES ('Zahraa Salim', 'student@digitalhub.com', NULL)
ON CONFLICT DO NOTHING;

-- Application (pending)
INSERT INTO applications (cohort_id, applicant_id, status, submitted_at)
VALUES (
  (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026'),
  (SELECT id FROM applicants WHERE email='student@digitalhub.com' ORDER BY id DESC LIMIT 1),
  'pending',
  NOW()
)
ON CONFLICT DO NOTHING;

-- Submission answers for application (JSON)
INSERT INTO application_submissions (application_id, form_id, answers)
VALUES (
  (SELECT id FROM applications
    WHERE cohort_id=(SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026')
    ORDER BY id DESC LIMIT 1
  ),
  (SELECT id FROM forms WHERE key='cohort_application'),
  jsonb_build_object(
    'full_name', 'Zahraa Salim',
    'email', 'student@digitalhub.com',
    'why_join', 'I want to become job-ready by building real projects and improving my portfolio.'
  )
)
ON CONFLICT DO NOTHING;

-- OPTIONAL: create an approved enrollment demo (comment out if you want to test approval flow via API)
-- Mark application approved + create enrollment
UPDATE applications
SET status='approved',
    reviewed_by=(SELECT id FROM users WHERE email='admin@digitalhub.com'),
    reviewed_at=NOW()
WHERE id = (
  SELECT id FROM applications
  WHERE cohort_id=(SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026')
  ORDER BY id DESC LIMIT 1
);

INSERT INTO enrollments (student_user_id, cohort_id, application_id, status)
VALUES (
  (SELECT id FROM users WHERE email='student@digitalhub.com'),
  (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026'),
  (SELECT id FROM applications
    WHERE cohort_id=(SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026')
    ORDER BY id DESC LIMIT 1
  ),
  'active'
)
ON CONFLICT (student_user_id, cohort_id) DO UPDATE SET
  status=EXCLUDED.status;

-- =========================================================
-- 10) ANNOUNCEMENTS (website)
-- =========================================================
INSERT INTO announcements (
  title, body, target_audience, cohort_id, is_auto, is_published, publish_at, created_by
)
VALUES
  (
    'Applications Open: Full Stack — Spring 2026',
    'Applications are open now. Apply to join our full stack cohort and build real projects.',
    'website',
    (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026'),
    FALSE,
    TRUE,
    NOW(),
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  ),
  (
    'UI/UX Cohort Coming Soon',
    'Our UI/UX cohort is coming soon. Follow announcements for opening dates.',
    'website',
    (SELECT id FROM cohorts WHERE name='UI/UX — Coming Soon'),
    TRUE,
    TRUE,
    NOW(),
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  )
ON CONFLICT DO NOTHING;

-- =========================================================
-- 11) EVENTS
-- =========================================================
INSERT INTO events (
  slug, title, description, location,
  starts_at, ends_at, is_published,
  is_done, done_at, created_by
)
VALUES
  (
    'open-day-2026',
    'Digital Hub Open Day',
    'Meet our team and learn about programs, projects, and how we help learners become employable.',
    NULL, -- will fall back to site_settings.default_event_location
    NOW() + INTERVAL '10 days',
    NOW() + INTERVAL '10 days' + INTERVAL '2 hours',
    TRUE,
    FALSE,
    NULL,
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  ),
  (
    'career-talk-2026',
    'Career Talk: Building a Portfolio',
    'A session on building strong portfolios and presenting projects to recruiters.',
    'Digital Hub',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days' + INTERVAL '2 hours',
    TRUE,
    TRUE,
    NOW() - INTERVAL '20 days' + INTERVAL '3 hours',
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  )
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title,
  description=EXCLUDED.description,
  location=EXCLUDED.location,
  starts_at=EXCLUDED.starts_at,
  ends_at=EXCLUDED.ends_at,
  is_published=EXCLUDED.is_published,
  is_done=EXCLUDED.is_done,
  done_at=EXCLUDED.done_at,
  updated_at=NOW();

-- =========================================================
-- 12) CONTACT MESSAGES (visitor + recruiter visit request)
-- =========================================================
INSERT INTO contact_messages (
  name, email, phone, subject, message, kind,
  company_name, company_role, visit_preferred_dates, visit_notes,
  status, assigned_to
)
VALUES
  (
    'Visitor One',
    'visitor@example.com',
    NULL,
    'Question about programs',
    'Hi, I want to know when applications open and what requirements are needed.',
    'question',
    NULL, NULL, NULL, NULL,
    'new',
    NULL
  ),
  (
    'Recruiter A',
    'recruiter@company.com',
    '+961-00-000-111',
    'Visit request',
    'We would like to visit Digital Hub to meet students and discuss opportunities.',
    'visit_request',
    'Company A',
    'Recruiter',
    'Next two weeks (weekday mornings)',
    'Interested in meeting Full Stack cohort students.',
    'new',
    (SELECT id FROM users WHERE email='admin@digitalhub.com')
  )
ON CONFLICT DO NOTHING;

-- =========================================================
-- 13) LOGS + ADMIN NOTIFICATIONS (demo examples)
-- =========================================================
-- Log an example action
INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, message, metadata)
VALUES (
  (SELECT id FROM users WHERE email='admin@digitalhub.com'),
  'SEED_DATA_INSERTED',
  'system',
  NULL,
  'Seed data inserted successfully.',
  jsonb_build_object('source','seed.sql')
)
ON CONFLICT DO NOTHING;

-- Create a notification for admin linked to the latest SEED_DATA_INSERTED log
INSERT INTO admin_notifications (recipient_admin_user_id, log_id, title, body)
SELECT
  (SELECT id FROM users WHERE email='admin@digitalhub.com'),
  l.id,
  'Seed completed',
  'Seed data inserted successfully.'
FROM activity_logs l
WHERE l.action='SEED_DATA_INSERTED'
ORDER BY l.created_at DESC
LIMIT 1;

COMMIT;

-- Done.
-- Login demo credentials (if using SQL-created bcrypt):
--   admin@digitalhub.com / ChangeMe123!
--   instructor@digitalhub.com / ChangeMe123!
--   student@digitalhub.com / ChangeMe123!
--
-- IMPORTANT: Change passwords immediately in production.
