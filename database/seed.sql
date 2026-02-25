

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

-- Admin profile (admin shown publicly)
INSERT INTO admin_profiles (
  user_id, full_name, avatar_url, bio, job_title,
  linkedin_url, github_url, portfolio_url,
  admin_role,
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
  'super_admin',
  TRUE,
  1
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name=EXCLUDED.full_name,
  bio=EXCLUDED.bio,
  job_title=EXCLUDED.job_title,
  admin_role=EXCLUDED.admin_role,
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
-- 9B) MORE REALISTIC APPLICATION PIPELINE DATA
-- =========================================================
-- More applicants for the open Full Stack cohort with mixed outcomes.
WITH extra_applicants(full_name, email, phone, status, submitted_days, reviewed_days, why_join) AS (
  VALUES
    ('Omar Nasser',  'omar.nasser@example.com',  '+961-70-000-111', 'approved',   21, 18, 'I want structured mentoring to transition into full-stack development.'),
    ('Leila Farah',  'leila.farah@example.com',  '+961-70-000-112', 'approved',   17, 14, 'I learn best by building projects with feedback from instructors.'),
    ('Karim Haddad', 'karim.haddad@example.com', '+961-70-000-113', 'pending',     9, NULL, 'I want to improve my backend fundamentals and deployment skills.'),
    ('Nour Saad',    'nour.saad@example.com',    '+961-70-000-114', 'waitlisted', 12,  6, 'I can commit full-time and I am motivated to become job-ready quickly.'),
    ('Maya Khoury',  'maya.khoury@example.com',  '+961-70-000-115', 'rejected',   15,  8, 'I am exploring software and want to validate if this path fits me.'),
    ('Hadi Mansour', 'hadi.mansour@example.com', '+961-70-000-116', 'pending',     5, NULL, 'I want to strengthen problem solving and API design for real products.'),
    ('Rana Tarek',   'rana.tarek@example.com',   '+961-70-000-117', 'approved',   11,  7, 'I want to build a strong portfolio to apply for junior developer roles.'),
    ('Samer Jaber',  'samer.jaber@example.com',  '+961-70-000-118', 'waitlisted',  7,  4, 'I am committed to daily practice and teamwork-based learning.'),
    ('Dima Ali',     'dima.ali@example.com',     '+961-70-000-119', 'pending',     3, NULL, 'I want guided learning and code reviews to improve quickly.'),
    ('Jad Rami',     'jad.rami@example.com',     '+961-70-000-120', 'rejected',   10,  6, 'I am interested but currently cannot commit to the weekly schedule.')
),
target_cohort AS (
  SELECT id
  FROM cohorts
  WHERE name = 'Full Stack — Spring 2026'
  LIMIT 1
),
admin_actor AS (
  SELECT id
  FROM users
  WHERE email = 'admin@digitalhub.com'
  LIMIT 1
)
INSERT INTO applicants (full_name, email, phone)
SELECT ea.full_name, ea.email, ea.phone
FROM extra_applicants ea
WHERE NOT EXISTS (
  SELECT 1
  FROM applicants a
  WHERE lower(a.email) = lower(ea.email)
);

WITH extra_applicants(full_name, email, phone, status, submitted_days, reviewed_days, why_join) AS (
  VALUES
    ('Omar Nasser',  'omar.nasser@example.com',  '+961-70-000-111', 'approved',   21, 18, 'I want structured mentoring to transition into full-stack development.'),
    ('Leila Farah',  'leila.farah@example.com',  '+961-70-000-112', 'approved',   17, 14, 'I learn best by building projects with feedback from instructors.'),
    ('Karim Haddad', 'karim.haddad@example.com', '+961-70-000-113', 'pending',     9, NULL, 'I want to improve my backend fundamentals and deployment skills.'),
    ('Nour Saad',    'nour.saad@example.com',    '+961-70-000-114', 'waitlisted', 12,  6, 'I can commit full-time and I am motivated to become job-ready quickly.'),
    ('Maya Khoury',  'maya.khoury@example.com',  '+961-70-000-115', 'rejected',   15,  8, 'I am exploring software and want to validate if this path fits me.'),
    ('Hadi Mansour', 'hadi.mansour@example.com', '+961-70-000-116', 'pending',     5, NULL, 'I want to strengthen problem solving and API design for real products.'),
    ('Rana Tarek',   'rana.tarek@example.com',   '+961-70-000-117', 'approved',   11,  7, 'I want to build a strong portfolio to apply for junior developer roles.'),
    ('Samer Jaber',  'samer.jaber@example.com',  '+961-70-000-118', 'waitlisted',  7,  4, 'I am committed to daily practice and teamwork-based learning.'),
    ('Dima Ali',     'dima.ali@example.com',     '+961-70-000-119', 'pending',     3, NULL, 'I want guided learning and code reviews to improve quickly.'),
    ('Jad Rami',     'jad.rami@example.com',     '+961-70-000-120', 'rejected',   10,  6, 'I am interested but currently cannot commit to the weekly schedule.')
),
target_cohort AS (
  SELECT id
  FROM cohorts
  WHERE name = 'Full Stack — Spring 2026'
  LIMIT 1
),
admin_actor AS (
  SELECT id
  FROM users
  WHERE email = 'admin@digitalhub.com'
  LIMIT 1
),
applicant_map AS (
  SELECT lower(email) AS email_norm, MAX(id) AS applicant_id
  FROM applicants
  GROUP BY lower(email)
)
INSERT INTO applications (
  cohort_id,
  applicant_id,
  applicant_email_norm,
  applicant_phone_norm,
  status,
  reviewed_by,
  reviewed_at,
  submitted_at
)
SELECT
  tc.id,
  am.applicant_id,
  lower(ea.email) AS applicant_email_norm,
  regexp_replace(COALESCE(ea.phone, ''), '\D', '', 'g') AS applicant_phone_norm,
  ea.status::text,
  CASE
    WHEN ea.status IN ('approved', 'rejected', 'waitlisted') THEN aa.id
    ELSE NULL
  END AS reviewed_by,
  CASE
    WHEN ea.status IN ('approved', 'rejected', 'waitlisted') THEN NOW() - (ea.reviewed_days || ' days')::interval
    ELSE NULL
  END AS reviewed_at,
  NOW() - (ea.submitted_days || ' days')::interval AS submitted_at
FROM extra_applicants ea
JOIN target_cohort tc ON TRUE
JOIN admin_actor aa ON TRUE
JOIN applicant_map am ON am.email_norm = lower(ea.email)
ON CONFLICT (cohort_id, applicant_email_norm) WHERE applicant_email_norm IS NOT NULL DO UPDATE SET
  applicant_id = EXCLUDED.applicant_id,
  applicant_phone_norm = EXCLUDED.applicant_phone_norm,
  status = EXCLUDED.status,
  reviewed_by = EXCLUDED.reviewed_by,
  reviewed_at = EXCLUDED.reviewed_at,
  submitted_at = EXCLUDED.submitted_at;

WITH extra_applicants(full_name, email, phone, status, submitted_days, reviewed_days, why_join) AS (
  VALUES
    ('Omar Nasser',  'omar.nasser@example.com',  '+961-70-000-111', 'approved',   21, 18, 'I want structured mentoring to transition into full-stack development.'),
    ('Leila Farah',  'leila.farah@example.com',  '+961-70-000-112', 'approved',   17, 14, 'I learn best by building projects with feedback from instructors.'),
    ('Karim Haddad', 'karim.haddad@example.com', '+961-70-000-113', 'pending',     9, NULL, 'I want to improve my backend fundamentals and deployment skills.'),
    ('Nour Saad',    'nour.saad@example.com',    '+961-70-000-114', 'waitlisted', 12,  6, 'I can commit full-time and I am motivated to become job-ready quickly.'),
    ('Maya Khoury',  'maya.khoury@example.com',  '+961-70-000-115', 'rejected',   15,  8, 'I am exploring software and want to validate if this path fits me.'),
    ('Hadi Mansour', 'hadi.mansour@example.com', '+961-70-000-116', 'pending',     5, NULL, 'I want to strengthen problem solving and API design for real products.'),
    ('Rana Tarek',   'rana.tarek@example.com',   '+961-70-000-117', 'approved',   11,  7, 'I want to build a strong portfolio to apply for junior developer roles.'),
    ('Samer Jaber',  'samer.jaber@example.com',  '+961-70-000-118', 'waitlisted',  7,  4, 'I am committed to daily practice and teamwork-based learning.'),
    ('Dima Ali',     'dima.ali@example.com',     '+961-70-000-119', 'pending',     3, NULL, 'I want guided learning and code reviews to improve quickly.'),
    ('Jad Rami',     'jad.rami@example.com',     '+961-70-000-120', 'rejected',   10,  6, 'I am interested but currently cannot commit to the weekly schedule.')
),
target_cohort AS (
  SELECT id
  FROM cohorts
  WHERE name = 'Full Stack — Spring 2026'
  LIMIT 1
),
target_form AS (
  SELECT id
  FROM forms
  WHERE key = 'cohort_application'
  LIMIT 1
)
INSERT INTO application_submissions (application_id, form_id, answers)
SELECT
  ap.id,
  tf.id,
  jsonb_build_object(
    'full_name', ea.full_name,
    'email', ea.email,
    'phone', ea.phone,
    'why_join', ea.why_join
  )
FROM extra_applicants ea
JOIN target_cohort tc ON TRUE
JOIN target_form tf ON TRUE
JOIN applications ap
  ON ap.cohort_id = tc.id
 AND ap.applicant_email_norm = lower(ea.email)
WHERE NOT EXISTS (
  SELECT 1
  FROM application_submissions sub
  WHERE sub.application_id = ap.id
);

-- Create student accounts/profiles for approved applicants to support realistic enrollment demos.
INSERT INTO users (email, password_hash, is_student, is_active)
VALUES
  ('omar.nasser@example.com', crypt('ChangeMe123!', gen_salt('bf', 10)), TRUE, TRUE),
  ('leila.farah@example.com', crypt('ChangeMe123!', gen_salt('bf', 10)), TRUE, TRUE),
  ('rana.tarek@example.com', crypt('ChangeMe123!', gen_salt('bf', 10)), TRUE, TRUE)
ON CONFLICT (email) DO UPDATE
SET is_student = TRUE, is_active = TRUE;

INSERT INTO student_profiles (
  user_id, full_name, avatar_url, bio,
  linkedin_url, github_url, portfolio_url,
  is_public, featured, featured_rank, public_slug
)
VALUES
  (
    (SELECT id FROM users WHERE email='omar.nasser@example.com'),
    'Omar Nasser',
    NULL,
    'Backend-focused learner building API and database projects.',
    NULL,
    'https://github.com/omar-nasser',
    NULL,
    TRUE,
    FALSE,
    NULL,
    'omar-nasser'
  ),
  (
    (SELECT id FROM users WHERE email='leila.farah@example.com'),
    'Leila Farah',
    NULL,
    'Career-switcher focused on frontend architecture and UX quality.',
    NULL,
    'https://github.com/leila-farah',
    NULL,
    TRUE,
    FALSE,
    NULL,
    'leila-farah'
  ),
  (
    (SELECT id FROM users WHERE email='rana.tarek@example.com'),
    'Rana Tarek',
    NULL,
    'Developer interested in full-stack projects and deployment workflows.',
    NULL,
    'https://github.com/rana-tarek',
    NULL,
    TRUE,
    FALSE,
    NULL,
    'rana-tarek'
  )
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  bio = EXCLUDED.bio,
  github_url = EXCLUDED.github_url,
  is_public = EXCLUDED.is_public,
  public_slug = EXCLUDED.public_slug;

INSERT INTO enrollments (student_user_id, cohort_id, application_id, status, enrolled_at)
SELECT
  u.id AS student_user_id,
  ap.cohort_id,
  ap.id AS application_id,
  CASE
    WHEN lower(u.email) = 'rana.tarek@example.com' THEN 'paused'
    ELSE 'active'
  END AS status,
  NOW() - INTERVAL '5 days' AS enrolled_at
FROM users u
JOIN applications ap
  ON ap.applicant_email_norm = lower(u.email)
WHERE ap.status = 'approved'
  AND ap.cohort_id = (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' LIMIT 1)
  AND lower(u.email) IN ('omar.nasser@example.com', 'leila.farah@example.com', 'rana.tarek@example.com')
ON CONFLICT (student_user_id, cohort_id) DO UPDATE SET
  application_id = EXCLUDED.application_id,
  status = EXCLUDED.status,
  enrolled_at = EXCLUDED.enrolled_at;

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


INSERT INTO projects (
  student_user_id, title, description, image_url, github_url, live_url, is_public, sort_order
)
VALUES (
  (SELECT id FROM users WHERE email='student@digitalhub.com'),
  'Digital Hub Admin Dashboard',
  'Admin dashboard UI with sidebar routing, CMS pages, and clean card/table layouts.',
  'https://your-cdn.com/screenshots/digitalhub-dashboard.png',
  'https://github.com/Zahraa-Salim/digital-hub-dashboard',
  'https://your-live-demo.com',
  TRUE,
  1
)
ON CONFLICT (student_user_id, github_url) DO NOTHING;


-- Done.
-- Login demo credentials (if using SQL-created bcrypt):
--   admin@digitalhub.com / NewStrongPass123!
--   instructor@digitalhub.com / ChangeMe123!
--   student@digitalhub.com / ChangeMe123!
--
-- IMPORTANT: Change passwords immediately in production.
