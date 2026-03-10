

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
--   (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
-- instructor id:
--   (SELECT id FROM users WHERE email='instructor@digitalhub.com' ORDER BY id ASC LIMIT 1)
-- student id:
--   (SELECT id FROM users WHERE email='student@digitalhub.com' ORDER BY id ASC LIMIT 1)

-- =========================================================
-- 2) PROFILES
-- =========================================================
-- Instructor profile (public)
INSERT INTO instructor_profiles (
  user_id, full_name, avatar_url, bio, expertise, skills,
  linkedin_url, github_url, portfolio_url, is_public
)
VALUES (
  (SELECT id FROM users WHERE email='instructor@digitalhub.com' ORDER BY id ASC LIMIT 1),
  'Rami Haddad',
  NULL,
  'Full-stack engineer and mentor focused on employability and project-based learning.',
  'React, Node.js, PostgreSQL, API Design',
  'React, Node.js, PostgreSQL, REST APIs, Mentoring',
  'https://www.linkedin.com/in/rami-haddad',
  'https://github.com/rami-haddad',
  NULL,
  TRUE
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name=EXCLUDED.full_name,
  bio=EXCLUDED.bio,
  expertise=EXCLUDED.expertise,
  skills=EXCLUDED.skills,
  is_public=EXCLUDED.is_public;

-- Student profile (public + featured)
INSERT INTO student_profiles (
  user_id, full_name, avatar_url, bio,
  linkedin_url, github_url, portfolio_url,
  is_public, featured, featured_rank, public_slug
)
VALUES (
  (SELECT id FROM users WHERE email='student@digitalhub.com' ORDER BY id ASC LIMIT 1),
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
  user_id, full_name, avatar_url, bio, job_title, skills,
  linkedin_url, github_url, portfolio_url,
  admin_role,
  is_public, sort_order
)
VALUES (
  (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
  'Digital Hub Admin',
  NULL,
  'Program manager supporting learners and partners to build real-world skills and employability.',
  'Program Manager',
  'Program Operations, Partner Relations, Curriculum Delivery',
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
  skills=EXCLUDED.skills,
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
  updated_by = (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
  updated_at = NOW()
WHERE id=1;

-- =========================================================
-- 4) THEME TOKENS (CSS variables)
-- =========================================================
INSERT INTO theme_tokens (key, purpose, value, scope, updated_by)
VALUES
  ('--bg', 'Background', '#0B0F19', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)),
  ('--text', 'Text', '#E6EAF2', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)),
  ('--primary', 'Primary', '#6D5EF7', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)),
  ('--card', 'Card Background', '#121A2A', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)),
  ('--border', 'Border', '#22304D', 'web', (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1))
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
      'hero_tag', 'About Digital Hub',
      'hero_title_primary', 'Practical Learning For',
      'hero_title_highlight', 'Real Career Progress',
      'hero_subtitle', 'Digital Hub helps learners move from foundations to delivery through project-driven programs, mentor feedback, and clear execution standards.',
      'hero_image_url', '/assets/img/others/inner_about_img.png',
      'hero_pills', jsonb_build_array(
        'Industry-aligned programs',
        'Mentor-supported learning',
        'Project-first outcomes'
      ),
      'primary_cta_text', 'Apply Now',
      'primary_cta_link', '/apply',
      'secondary_cta_text', 'Browse Programs',
      'secondary_cta_link', '/programs',
      'focus_eyebrow', 'What We Deliver',
      'focus_title', 'How The Learning Experience Works',
      'focus_description', 'Our delivery model combines technical depth, structured mentorship, and measurable outcomes so learners can build strong momentum.',
      'mission_eyebrow', 'Mission',
      'mission_title', 'What We Stand For',
      'mission_description', 'Digital Hub is designed to close the gap between learning and employability through practical, high-accountability training.',
      'outcomes_eyebrow', 'How We Measure Outcomes',
      'outcomes_title', 'Mission Impact KPIs',
      'outcomes_description', 'These KPI cards are tied to live platform entities: cohorts, participants, team members, and programs.',
      'programs_eyebrow', 'Program Portfolio',
      'programs_title', 'Program Names',
      'programs_description', 'Programs currently available across Digital Hub tracks.',
      'program_names_limit', 12,
      'alumni_eyebrow', 'Alumni Success Stories',
      'alumni_title', 'Real Outcomes From Recent Graduates',
      'alumni_description', 'Examples of graduates moving into delivery roles, freelance work, and product teams.',
      'partners_eyebrow', 'Partner Companies',
      'partners_title', 'Organizations Collaborating With Digital Hub',
      'partners_description', 'A sample of hiring and project partners connected to learner outcomes.',
      'faq_eyebrow', 'Mission FAQ',
      'faq_title', 'Program Impact Questions',
      'faq_description', 'Answers to common questions about outcomes, employability, and measurable impact.',
      'journey_eyebrow', 'Mission In Action',
      'journey_title', 'From Learning To Delivery',
      'journey_description', 'Participants move through a clear journey that turns learning into demonstrable execution.',
      'metric_cards', jsonb_build_array(
        jsonb_build_object('metric_key', 'team_number', 'label', 'Team Members', 'description', 'Instructors and managers supporting delivery and coaching.', 'suffix', '+'),
        jsonb_build_object('metric_key', 'programs', 'label', 'Programs', 'description', 'Active and upcoming tracks aligned with market needs.', 'suffix', '+'),
        jsonb_build_object('metric_key', 'cohorts_made', 'label', 'Cohorts Created', 'description', 'Cohorts launched across completed, running, open, and planned cycles.', 'suffix', '+'),
        jsonb_build_object('metric_key', 'participants', 'label', 'Participants', 'description', 'Participants currently tracked in the system.', 'suffix', '+')
      ),
      'outcome_kpi_cards', jsonb_build_array(
        jsonb_build_object('metric_key', 'cohorts_made', 'label', 'Cohorts Made', 'description', 'Total cohorts created and managed in the platform.', 'suffix', '+'),
        jsonb_build_object('metric_key', 'participants', 'label', 'Participants', 'description', 'Current participant count across active records.', 'suffix', '+'),
        jsonb_build_object('metric_key', 'team_number', 'label', 'Team Number', 'description', 'Combined instructors and management team supporting delivery.', 'suffix', '+'),
        jsonb_build_object('metric_key', 'programs', 'label', 'Programs', 'description', 'Program names are loaded below directly from the database.', 'suffix', '+')
      ),
      'focus_cards', jsonb_build_array(
        jsonb_build_object('title', 'Applied Learning', 'description', 'Learners build real deliverables, not just exercises, throughout each program.'),
        jsonb_build_object('title', 'Mentor Feedback Loops', 'description', 'Regular review cycles keep learners aligned with quality standards and deadlines.'),
        jsonb_build_object('title', 'Career Readiness', 'description', 'Training includes portfolio direction, communication practice, and execution habits.')
      ),
      'mission_cards', jsonb_build_array(
        jsonb_build_object('title', 'Access To Practical Skills', 'description', 'We help learners gain hands-on digital capabilities through guided, structured delivery.'),
        jsonb_build_object('title', 'Clarity And Accountability', 'description', 'Clear milestones and progress tracking help learners stay focused and move forward.'),
        jsonb_build_object('title', 'Community And Growth', 'description', 'Learners grow inside a support system of mentors, peers, and outcomes-focused coaching.')
      ),
      'alumni_story_cards', jsonb_build_array(
        jsonb_build_object('name', 'Nour Salameh', 'role', 'Frontend Developer', 'company', 'Cedar Tech', 'quote', 'The project cycle taught me how to deliver features under real deadlines.', 'outcome', 'Hired as a junior frontend developer after completing capstone delivery.'),
        jsonb_build_object('name', 'Hadi Nasser', 'role', 'Data Analyst', 'company', 'Insight Labs', 'quote', 'Mentor feedback on dashboards changed how I present data to stakeholders.', 'outcome', 'Moved from intern to full-time analyst role within three months.'),
        jsonb_build_object('name', 'Rana Farah', 'role', 'Product Associate', 'company', 'Launchbase', 'quote', 'The product workflow modules made roadmap planning and prioritization practical.', 'outcome', 'Transitioned from marketing coordination into product operations.')
      ),
      'partner_logo_cards', jsonb_build_array(
        jsonb_build_object('name', 'Cedar Tech', 'logo_url', '/assets/img/brand/brand01.png', 'link', 'https://example.com/cedar-tech'),
        jsonb_build_object('name', 'Insight Labs', 'logo_url', '/assets/img/brand/brand02.png', 'link', 'https://example.com/insight-labs'),
        jsonb_build_object('name', 'Launchbase', 'logo_url', '/assets/img/brand/brand03.png', 'link', 'https://example.com/launchbase'),
        jsonb_build_object('name', 'Beirut Digital Factory', 'logo_url', '/assets/img/brand/brand04.png', 'link', 'https://example.com/bdf'),
        jsonb_build_object('name', 'Nexa Systems', 'logo_url', '/assets/img/brand/brand05.png', 'link', 'https://example.com/nexa')
      ),
      'mission_faq_items', jsonb_build_array(
        jsonb_build_object('question', 'How are mission outcomes measured?', 'answer', 'We track operational KPIs such as cohorts created, participant activity, and team-supported delivery capacity.'),
        jsonb_build_object('question', 'Are these KPI cards static?', 'answer', 'No. The KPI cards map to live data keys and can also be overridden when needed for campaigns.'),
        jsonb_build_object('question', 'Where do program names come from?', 'answer', 'Program names are loaded directly from the programs table via public API endpoints.'),
        jsonb_build_object('question', 'What defines an alumni success story?', 'answer', 'Stories are outcome-focused: role transition, hiring progress, or tangible project delivery results.')
      ),
      'journey_cards', jsonb_build_array(
        jsonb_build_object('step', 'Step 01', 'title', 'Foundations', 'description', 'Learners build strong fundamentals with practical labs and guided assignments.'),
        jsonb_build_object('step', 'Step 02', 'title', 'Project Execution', 'description', 'Participants work on scoped projects that mirror professional delivery expectations.'),
        jsonb_build_object('step', 'Step 03', 'title', 'Career Positioning', 'description', 'Final outputs are refined for hiring readiness, portfolio quality, and interviews.')
      )
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('privacy', 'Privacy Policy',
    jsonb_build_object(
      'text', 'This is a demo privacy policy. Replace with your official policy.'
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('contact', 'Contact Us',
    jsonb_build_object(
      'hero_title', 'Get in Touch',
      'hero_subtitle', 'Questions, partnership requests, or visit planning. Reach out and our team will reply shortly.',
      'email', 'hello@digitalhub.com',
      'phone', '+961-00-000-000',
      'whatsapp', '+961-00-000-000',
      'address', 'Beirut, Lebanon',
      'map_embed_url', 'https://maps.google.com/?q=Beirut',
      'form_title', 'Send us a message',
      'submit_button_text', 'Send Message'
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('faq', 'Frequently Asked Questions',
    jsonb_build_object(
      'title', 'Frequently Asked Questions',
      'description', 'Find quick answers about programs, admissions, and communication.',
      'search_placeholder', 'Search questions...',
      'empty_state_text', 'No questions found.',
      'items', jsonb_build_array(
        jsonb_build_object(
          'question', 'Who can apply to Digital Hub programs?',
          'answer', 'Anyone interested in building practical digital skills can apply.'
        ),
        jsonb_build_object(
          'question', 'Do I need previous technical experience?',
          'answer', 'Not always. Requirements vary by program and are listed on each program page.'
        ),
        jsonb_build_object(
          'question', 'How will I know my application status?',
          'answer', 'You will receive updates through the contact details you provide in your application.'
        )
      )
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  )
ON CONFLICT (key) DO UPDATE SET
  title=EXCLUDED.title,
  content=EXCLUDED.content,
  is_published=EXCLUDED.is_published,
  updated_by=EXCLUDED.updated_by,
  updated_at=NOW();

INSERT INTO pages (key, title, content, is_published, updated_by)
VALUES
  ('programs', 'Programs',
    jsonb_build_object(
      'hero_title', 'All Programs',
      'hero_subtitle', 'Browse open and upcoming programs delivered through The Digital Hub.'
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('events', 'Events',
    jsonb_build_object(
      'hero_title', 'Events',
      'hero_subtitle', 'Community moments, open days, and career conversations hosted by The Digital Hub.',
      'start_label', 'Start',
      'end_label', 'End',
      'location_label', 'Location',
      'status_label', 'Status',
      'event_post_title', 'Event Post',
      'fallback_post_text', 'Details for this event will be published soon.',
      'not_available_text', 'N/A'
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('participants', 'Participants',
    jsonb_build_object(
      'hero_title', 'Participants',
      'hero_subtitle', 'Explore public participant profiles and discover emerging talent.'
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('team', 'Team',
    jsonb_build_object(
      'hero_title', 'Team',
      'hero_subtitle', 'Meet the admin and instructor teams behind The Digital Hub.'
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('apply', 'Apply',
    jsonb_build_object(
      'hero_title', 'Apply to Join',
      'hero_subtitle', 'Submit an application to a cohort or program using the forms below.'
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('hire_talent', 'Hire Talent',
    jsonb_build_object(
      'hero_title', 'Hire Digital Hub Talent',
      'hero_subtitle', 'Use the recruiter toolkit to explore demo matches and design your hiring flow.',
      'candidates', jsonb_build_array(
        jsonb_build_object(
          'name', 'Lina Haddad',
          'headline', 'Frontend Developer',
          'experienceLevel', 'mid',
          'locationType', 'remote',
          'location', 'Beirut, Lebanon',
          'availability', 'Immediate',
          'cohorts', jsonb_build_array('Full Stack - Spring 2026'),
          'skills', jsonb_build_array('React', 'TypeScript', 'UI/UX'),
          'summary', 'Builds accessible interfaces and converts product requirements into clean React code.',
          'matchNotes', jsonb_build_array('Strong React and TypeScript foundation', 'Good UX collaboration experience'),
          'avatar', '/assets/img/instructor/instructor01.png',
          'cvUrl', '/assets/docs/demo-cv.pdf',
          'portfolioUrl', '#',
          'linkedinUrl', '#',
          'email', 'lina.haddad@example.com'
        ),
        jsonb_build_object(
          'name', 'Ziad Farah',
          'headline', 'Full Stack Engineer',
          'experienceLevel', 'senior',
          'locationType', 'hybrid',
          'location', 'Tripoli, Lebanon',
          'availability', '2 weeks',
          'cohorts', jsonb_build_array('Backend Engineering - Winter 2025'),
          'skills', jsonb_build_array('Node.js', 'PostgreSQL', 'TypeScript'),
          'summary', 'Designs APIs, optimizes SQL queries, and mentors junior engineers.',
          'matchNotes', jsonb_build_array('Strong backend architecture', 'Reliable with production database workloads'),
          'avatar', '/assets/img/instructor/instructor02.png',
          'cvUrl', '/assets/docs/demo-cv.pdf',
          'portfolioUrl', '#',
          'linkedinUrl', '#',
          'email', 'ziad.farah@example.com'
        ),
        jsonb_build_object(
          'name', 'Maya Saade',
          'headline', 'Product Designer',
          'experienceLevel', 'mid',
          'locationType', 'on_site',
          'location', 'Saida, Lebanon',
          'availability', 'Immediate',
          'cohorts', jsonb_build_array('UI/UX Design - Fall 2025'),
          'skills', jsonb_build_array('UI/UX', 'React'),
          'summary', 'Creates design systems, prototypes quickly, and supports handoff with dev-ready specs.',
          'matchNotes', jsonb_build_array('Strong visual system thinking', 'Can support front-end implementation'),
          'avatar', '/assets/img/instructor/instructor03.png',
          'cvUrl', '/assets/docs/demo-cv.pdf',
          'portfolioUrl', '#',
          'linkedinUrl', '#',
          'email', 'maya.saade@example.com'
        ),
        jsonb_build_object(
          'name', 'Karim Nassar',
          'headline', 'Data Analyst',
          'experienceLevel', 'junior',
          'locationType', 'remote',
          'location', 'Byblos, Lebanon',
          'availability', '1 month',
          'cohorts', jsonb_build_array('Data & BI - Spring 2026'),
          'skills', jsonb_build_array('Data Analysis', 'PostgreSQL'),
          'summary', 'Transforms raw data into dashboards and insight reports for business teams.',
          'matchNotes', jsonb_build_array('Good analytical workflow', 'Comfortable with SQL reporting'),
          'avatar', '/assets/img/instructor/instructor04.png',
          'cvUrl', '/assets/docs/demo-cv.pdf',
          'portfolioUrl', '#',
          'linkedinUrl', '#',
          'email', 'karim.nassar@example.com'
        )
      )
    ),
    TRUE,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
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
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('about', 'About', TRUE, 2,
    jsonb_build_object(
      'subtitle', 'About The Digital Hub',
      'title', 'Empowering Youth with Practical Digital Skills',
      'description', 'The Digital Hub helps youth build practical digital skills through guided training, mentorship, and real projects that connect learning to work.',
      'bullet_points', jsonb_build_array(
        'Job-ready web and digital training',
        'Hands-on projects with mentor support',
        'Career preparation for real opportunities'
      ),
      'cta_text', 'Learn More About Us',
      'cta_link', '/about-us',
      'main_image_url', 'about_img.png',
      'shape_image_url', 'about_shape.svg'
    ),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('programs', 'Programs', TRUE, 3,
    jsonb_build_object('style', 'grid', 'limit', 6),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('team', 'Team', TRUE, 4,
    jsonb_build_object(
      'subtitle', 'Meet The Digital Hub Team',
      'title', 'Our Core Team of Managers and Team',
      'description', 'Meet the people behind Digital Hub programs, mentorship, and delivery. Our team supports learners from training to career readiness.',
      'cta_text', 'Meet The Full Team',
      'cta_link', '/team',
      'limit', 6,
      'source_mode', 'profiles'
    ),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('announcements', 'Announcements', TRUE, 5,
    jsonb_build_object(
      'subtitle', 'Latest Updates',
      'title', 'What Is Happening At The Digital Hub',
      'description', 'Track important updates across upcoming events, cohort announcements, and new opportunities published by the team.',
      'limit', 3,
      'cta_text', 'View All Updates',
      'cta_link', '/events'
    ),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
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
  ('cohort_application', 'Cohort Application', 'Apply to join a cohort.', TRUE, (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)),
  ('general_apply', 'General Apply Form', 'Public program-level application form.', TRUE, (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)),
  ('program_application', 'Program Application Form', 'Admin-managed program application form.', TRUE, (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)),
  ('contact', 'Contact Form', 'Send a question, feedback, or a visit request.', TRUE, (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1))
ON CONFLICT (key) DO UPDATE SET
  title=EXCLUDED.title,
  description=EXCLUDED.description,
  is_active=EXCLUDED.is_active,
  created_by=EXCLUDED.created_by,
  updated_at=NOW();

-- Cohort application fields (minimal demo)
INSERT INTO form_fields (form_id, name, label, type, required, options, placeholder, sort_order, is_enabled)
VALUES
  ((SELECT id FROM forms WHERE key='cohort_application' ORDER BY id ASC LIMIT 1), 'full_name', 'Full Name', 'text', TRUE, NULL, 'Your name', 1, TRUE),
  ((SELECT id FROM forms WHERE key='cohort_application' ORDER BY id ASC LIMIT 1), 'email', 'Email', 'email', TRUE, NULL, 'you@example.com', 2, TRUE),
  ((SELECT id FROM forms WHERE key='cohort_application' ORDER BY id ASC LIMIT 1), 'phone', 'Phone', 'phone', FALSE, NULL, '+961...', 3, TRUE),
  ((SELECT id FROM forms WHERE key='cohort_application' ORDER BY id ASC LIMIT 1), 'program_id', 'Program', 'select', TRUE, NULL, 'Select a program', 4, TRUE),
  ((SELECT id FROM forms WHERE key='cohort_application' ORDER BY id ASC LIMIT 1), 'why_join', 'Why do you want to join?', 'textarea', TRUE, NULL, 'Tell us your goals...', 5, TRUE)
ON CONFLICT (form_id, name) DO UPDATE SET
  label=EXCLUDED.label,
  type=EXCLUDED.type,
  required=EXCLUDED.required,
  options=EXCLUDED.options,
  placeholder=EXCLUDED.placeholder,
  sort_order=EXCLUDED.sort_order,
  is_enabled=EXCLUDED.is_enabled;

-- Public general apply fields
INSERT INTO form_fields (form_id, name, label, type, required, options, placeholder, sort_order, is_enabled)
VALUES
  ((SELECT id FROM forms WHERE key='general_apply' ORDER BY id ASC LIMIT 1), 'full_name', 'Full Name', 'text', TRUE, NULL, 'Your name', 1, TRUE),
  ((SELECT id FROM forms WHERE key='general_apply' ORDER BY id ASC LIMIT 1), 'email', 'Email', 'email', TRUE, NULL, 'you@example.com', 2, TRUE),
  ((SELECT id FROM forms WHERE key='general_apply' ORDER BY id ASC LIMIT 1), 'phone', 'Phone', 'phone', FALSE, NULL, '+961...', 3, TRUE),
  ((SELECT id FROM forms WHERE key='general_apply' ORDER BY id ASC LIMIT 1), 'program_id', 'Program', 'select', TRUE, NULL, 'Select a program', 4, TRUE),
  ((SELECT id FROM forms WHERE key='general_apply' ORDER BY id ASC LIMIT 1), 'why_join', 'Why do you want to join?', 'textarea', TRUE, NULL, 'Tell us your goals...', 5, TRUE)
ON CONFLICT (form_id, name) DO UPDATE SET
  label=EXCLUDED.label,
  type=EXCLUDED.type,
  required=EXCLUDED.required,
  options=EXCLUDED.options,
  placeholder=EXCLUDED.placeholder,
  sort_order=EXCLUDED.sort_order,
  is_enabled=EXCLUDED.is_enabled;

-- Admin program application form fields
INSERT INTO form_fields (form_id, name, label, type, required, options, placeholder, sort_order, is_enabled)
VALUES
  ((SELECT id FROM forms WHERE key='program_application' ORDER BY id ASC LIMIT 1), 'full_name', 'Full Name', 'text', TRUE, NULL, 'Your name', 1, TRUE),
  ((SELECT id FROM forms WHERE key='program_application' ORDER BY id ASC LIMIT 1), 'email', 'Email', 'email', TRUE, NULL, 'you@example.com', 2, TRUE),
  ((SELECT id FROM forms WHERE key='program_application' ORDER BY id ASC LIMIT 1), 'phone', 'Phone', 'phone', FALSE, NULL, '+961...', 3, TRUE),
  ((SELECT id FROM forms WHERE key='program_application' ORDER BY id ASC LIMIT 1), 'program_id', 'Program', 'select', TRUE, NULL, 'Select a program', 4, TRUE),
  ((SELECT id FROM forms WHERE key='program_application' ORDER BY id ASC LIMIT 1), 'why_join', 'Why do you want to join?', 'textarea', TRUE, NULL, 'Tell us your goals...', 5, TRUE)
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
  ((SELECT id FROM forms WHERE key='contact' ORDER BY id ASC LIMIT 1), 'name', 'Name', 'text', TRUE, NULL, 'Your name', 1, TRUE),
  ((SELECT id FROM forms WHERE key='contact' ORDER BY id ASC LIMIT 1), 'email', 'Email', 'email', TRUE, NULL, 'you@example.com', 2, TRUE),
  ((SELECT id FROM forms WHERE key='contact' ORDER BY id ASC LIMIT 1), 'kind', 'Message Type', 'select', TRUE,
    jsonb_build_object('choices', jsonb_build_array('question','feedback','visit_request')),
    NULL, 3, TRUE),
  ((SELECT id FROM forms WHERE key='contact' ORDER BY id ASC LIMIT 1), 'message', 'Message', 'textarea', TRUE, NULL, 'Write your message...', 4, TRUE)
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
   (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  ('ui-ux', 'UI/UX Design',
   'Learn design thinking and build real UI projects.',
   'User research, wireframing, prototyping, and design systems.',
   'Creativity and basic computer skills.',
   15,
   TRUE,
   (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  )
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title,
  summary=EXCLUDED.summary,
  description=EXCLUDED.description,
  requirements=EXCLUDED.requirements,
  default_capacity=EXCLUDED.default_capacity,
  is_published=EXCLUDED.is_published,
  updated_at=NOW();

-- Keep the "Program" select options synced from real programs.
-- value = program id (string), label = program title
UPDATE form_fields ff
SET options = COALESCE(src.options, '[]'::jsonb)
FROM (
  SELECT jsonb_agg(
           jsonb_build_object('label', p.title, 'value', p.id::text)
           ORDER BY p.title
         ) AS options
  FROM programs p
  WHERE p.deleted_at IS NULL
    AND p.is_published = TRUE
) src
WHERE ff.form_id = (SELECT id FROM forms WHERE key = 'cohort_application' LIMIT 1)
  AND ff.name = 'program_id';

UPDATE form_fields ff
SET options = COALESCE(src.options, '[]'::jsonb)
FROM (
  SELECT jsonb_agg(
           jsonb_build_object('label', p.title, 'value', p.id::text)
           ORDER BY p.title
         ) AS options
  FROM programs p
  WHERE p.deleted_at IS NULL
    AND p.is_published = TRUE
) src
WHERE ff.form_id IN (
    SELECT id
    FROM forms
    WHERE key IN ('general_apply', 'program_application')
  )
  AND ff.name = 'program_id';

-- =========================================================
-- 8A) MESSAGE TEMPLATES
-- =========================================================
INSERT INTO message_templates (key, label, description, channel, subject, body, is_active, sort_order, created_by, updated_by)
VALUES
  (
    'general_update',
    'General Update',
    'Generic update for applicants/users.',
    'all',
    'General Update',
    'Hello {name},\n\nWe have a quick update for you.\n\nBest regards,\nDigital Hub Team',
    TRUE,
    10,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  (
    'reminder',
    'Reminder',
    'Reminder message for pending actions.',
    'all',
    'Reminder',
    'Hello {name},\n\nThis is a reminder about your pending action.\n\nBest regards,\nDigital Hub Team',
    TRUE,
    20,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  (
    'follow_up',
    'Follow Up',
    'Follow-up message after a previous contact.',
    'all',
    'Follow Up',
    'Hello {name},\n\nFollowing up on our previous message.\n\nBest regards,\nDigital Hub Team',
    TRUE,
    30,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  (
    'interview_scheduling',
    'Interview Scheduling',
    'Template for interview scheduling messages.',
    'all',
    'Interview Invitation',
    E'Dear {name},\n\nYour interview has been scheduled on {scheduled_at}.\nDuration: {duration_minutes} minutes\nLocation Type: {location_type}\nLocation Details: {location_details}\nApplication ID: {application_id}\nConfirm Token: {confirm_token}\nConfirm here: {confirm_url}\nReschedule here: {reschedule_url}\n\nBest regards,\nAdmissions Team',
    TRUE,
    40,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  (
    'interview_confirmation',
    'Interview Confirmation',
    'Template when interview is confirmed.',
    'all',
    'Interview Confirmed',
    E'Dear {name},\n\nYour interview is confirmed for {scheduled_at}.\nWe look forward to speaking with you.\n\nBest regards,\nAdmissions Team',
    TRUE,
    50,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  (
    'decision_accepted',
    'Acceptance Letter',
    'Template for accepted decisions.',
    'all',
    'Application Accepted',
    E'Dear {name},\n\nCongratulations. You have been accepted into our program.\nIf you are sure you want to join, please confirm here:\n{participation_confirm_url}\n\nWarm regards,\nAdmissions Team',
    TRUE,
    60,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  (
    'decision_rejected',
    'Rejection Notice',
    'Template for rejected decisions.',
    'all',
    'Application Update',
    E'Dear {name},\n\nThank you for applying. After careful review, we are unable to offer a place at this time.\n\nBest regards,\nAdmissions Team',
    TRUE,
    70,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  (
    'account_credentials',
    'Account Credentials',
    'Sent automatically when admin creates a user from an application.',
    'all',
    'Your Digital Hub Account',
    E'Dear {name},\n\nYour student account has been created.\nEmail: {email}\nTemporary Password: {generated_password}\nSign in here: {sign_in_url}\n\nPlease sign in and change your password.\n\nBest regards,\nDigital Hub Team',
    TRUE,
    80,
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  )
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  channel = EXCLUDED.channel,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();


-- Cohorts (real runs)
INSERT INTO cohorts (
  program_id, name, status, allow_applications, capacity,
  enrollment_open_at, enrollment_close_at, start_date, end_date
)
VALUES
  (
    (SELECT id FROM programs WHERE slug='full-stack' ORDER BY id ASC LIMIT 1),
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
    (SELECT id FROM programs WHERE slug='ui-ux' ORDER BY id ASC LIMIT 1),
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

UPDATE cohorts
SET
  use_general_form = TRUE,
  application_form_id = (SELECT id FROM forms WHERE key = 'cohort_application' LIMIT 1)
WHERE name IN ('Full Stack — Spring 2026', 'UI/UX — Coming Soon');

-- Assign instructor to the open cohort
INSERT INTO cohort_instructors (cohort_id, instructor_user_id, cohort_role)
VALUES (
  (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' ORDER BY id ASC LIMIT 1),
  (SELECT id FROM users WHERE email='instructor@digitalhub.com' ORDER BY id ASC LIMIT 1),
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

-- Application (applied)
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
VALUES (
  (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' ORDER BY id ASC LIMIT 1),
  (SELECT id FROM applicants WHERE email='student@digitalhub.com' ORDER BY id DESC LIMIT 1),
  lower('student@digitalhub.com'),
  NULL,
  jsonb_build_object(
    'full_name', 'Zahraa Salim',
    'email', 'student@digitalhub.com',
    'program_id', (SELECT id::text FROM programs WHERE slug='full-stack'),
    'why_join', 'I want to become job-ready by building real projects and improving my portfolio.'
  ),
  'applied',
  'applied',
  NOW()
)
ON CONFLICT (cohort_id, applicant_email_norm) WHERE applicant_email_norm IS NOT NULL DO UPDATE SET
  applicant_id = EXCLUDED.applicant_id,
  submission_answers = EXCLUDED.submission_answers,
  stage = EXCLUDED.stage,
  status = EXCLUDED.status,
  submitted_at = EXCLUDED.submitted_at;

-- Submission answers for application (JSON)
INSERT INTO application_submissions (application_id, form_id, answers)
VALUES (
  (SELECT id FROM applications
    WHERE cohort_id=(SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' ORDER BY id ASC LIMIT 1)
    ORDER BY id DESC LIMIT 1
  ),
  (SELECT id FROM forms WHERE key='cohort_application' ORDER BY id ASC LIMIT 1),
  jsonb_build_object(
    'full_name', 'Zahraa Salim',
    'email', 'student@digitalhub.com',
    'program_id', (SELECT id::text FROM programs WHERE slug='full-stack'),
    'why_join', 'I want to become job-ready by building real projects and improving my portfolio.'
  )
)
ON CONFLICT DO NOTHING;

-- OPTIONAL: create an approved enrollment demo (comment out if you want to test approval flow via API)
-- Mark application approved + create enrollment
UPDATE applications
SET status='participation_confirmed',
    stage='participation_confirmed',
    participation_confirmed_at=NOW(),
    reviewed_by=(SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    reviewed_at=NOW()
WHERE id = (
  SELECT id FROM applications
  WHERE cohort_id=(SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' ORDER BY id ASC LIMIT 1)
  ORDER BY id DESC LIMIT 1
);

INSERT INTO enrollments (student_user_id, cohort_id, application_id, status)
VALUES (
  (SELECT id FROM users WHERE email='student@digitalhub.com' ORDER BY id ASC LIMIT 1),
  (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' ORDER BY id ASC LIMIT 1),
  (SELECT id FROM applications
    WHERE cohort_id=(SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' ORDER BY id ASC LIMIT 1)
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
    ('Omar Nasser',  'omar.nasser@example.com',  '+961-70-000-111', 'accepted',   21, 18, 'I want structured mentoring to transition into full-stack development.'),
    ('Leila Farah',  'leila.farah@example.com',  '+961-70-000-112', 'accepted',   17, 14, 'I learn best by building projects with feedback from instructors.'),
    ('Karim Haddad', 'karim.haddad@example.com', '+961-70-000-113', 'applied',     9, NULL, 'I want to improve my backend fundamentals and deployment skills.'),
    ('Nour Saad',    'nour.saad@example.com',    '+961-70-000-114', 'reviewing', 12,  6, 'I can commit full-time and I am motivated to become job-ready quickly.'),
    ('Maya Khoury',  'maya.khoury@example.com',  '+961-70-000-115', 'rejected',   15,  8, 'I am exploring software and want to validate if this path fits me.'),
    ('Hadi Mansour', 'hadi.mansour@example.com', '+961-70-000-116', 'applied',     5, NULL, 'I want to strengthen problem solving and API design for real products.'),
    ('Rana Tarek',   'rana.tarek@example.com',   '+961-70-000-117', 'accepted',   11,  7, 'I want to build a strong portfolio to apply for junior developer roles.'),
    ('Samer Jaber',  'samer.jaber@example.com',  '+961-70-000-118', 'reviewing',  7,  4, 'I am committed to daily practice and teamwork-based learning.'),
    ('Dima Ali',     'dima.ali@example.com',     '+961-70-000-119', 'applied',     3, NULL, 'I want guided learning and code reviews to improve quickly.'),
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
    ('Omar Nasser',  'omar.nasser@example.com',  '+961-70-000-111', 'accepted',   21, 18, 'I want structured mentoring to transition into full-stack development.'),
    ('Leila Farah',  'leila.farah@example.com',  '+961-70-000-112', 'accepted',   17, 14, 'I learn best by building projects with feedback from instructors.'),
    ('Karim Haddad', 'karim.haddad@example.com', '+961-70-000-113', 'applied',     9, NULL, 'I want to improve my backend fundamentals and deployment skills.'),
    ('Nour Saad',    'nour.saad@example.com',    '+961-70-000-114', 'reviewing', 12,  6, 'I can commit full-time and I am motivated to become job-ready quickly.'),
    ('Maya Khoury',  'maya.khoury@example.com',  '+961-70-000-115', 'rejected',   15,  8, 'I am exploring software and want to validate if this path fits me.'),
    ('Hadi Mansour', 'hadi.mansour@example.com', '+961-70-000-116', 'applied',     5, NULL, 'I want to strengthen problem solving and API design for real products.'),
    ('Rana Tarek',   'rana.tarek@example.com',   '+961-70-000-117', 'accepted',   11,  7, 'I want to build a strong portfolio to apply for junior developer roles.'),
    ('Samer Jaber',  'samer.jaber@example.com',  '+961-70-000-118', 'reviewing',  7,  4, 'I am committed to daily practice and teamwork-based learning.'),
    ('Dima Ali',     'dima.ali@example.com',     '+961-70-000-119', 'applied',     3, NULL, 'I want guided learning and code reviews to improve quickly.'),
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
  stage,
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
  CASE
    WHEN ea.status = 'accepted' THEN 'accepted'
    WHEN ea.status = 'rejected' THEN 'rejected'
    WHEN ea.status = 'reviewing' THEN 'reviewing'
    ELSE 'applied'
  END AS stage,
  ea.status::text,
  CASE
    WHEN ea.status IN ('accepted', 'rejected', 'reviewing') THEN aa.id
    ELSE NULL
  END AS reviewed_by,
  CASE
    WHEN ea.status IN ('accepted', 'rejected', 'reviewing') THEN NOW() - (ea.reviewed_days || ' days')::interval
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
  stage = EXCLUDED.stage,
  status = EXCLUDED.status,
  reviewed_by = EXCLUDED.reviewed_by,
  reviewed_at = EXCLUDED.reviewed_at,
  submitted_at = EXCLUDED.submitted_at;

WITH extra_applicants(full_name, email, phone, status, submitted_days, reviewed_days, why_join) AS (
  VALUES
    ('Omar Nasser',  'omar.nasser@example.com',  '+961-70-000-111', 'accepted',   21, 18, 'I want structured mentoring to transition into full-stack development.'),
    ('Leila Farah',  'leila.farah@example.com',  '+961-70-000-112', 'accepted',   17, 14, 'I learn best by building projects with feedback from instructors.'),
    ('Karim Haddad', 'karim.haddad@example.com', '+961-70-000-113', 'applied',     9, NULL, 'I want to improve my backend fundamentals and deployment skills.'),
    ('Nour Saad',    'nour.saad@example.com',    '+961-70-000-114', 'reviewing', 12,  6, 'I can commit full-time and I am motivated to become job-ready quickly.'),
    ('Maya Khoury',  'maya.khoury@example.com',  '+961-70-000-115', 'rejected',   15,  8, 'I am exploring software and want to validate if this path fits me.'),
    ('Hadi Mansour', 'hadi.mansour@example.com', '+961-70-000-116', 'applied',     5, NULL, 'I want to strengthen problem solving and API design for real products.'),
    ('Rana Tarek',   'rana.tarek@example.com',   '+961-70-000-117', 'accepted',   11,  7, 'I want to build a strong portfolio to apply for junior developer roles.'),
    ('Samer Jaber',  'samer.jaber@example.com',  '+961-70-000-118', 'reviewing',  7,  4, 'I am committed to daily practice and teamwork-based learning.'),
    ('Dima Ali',     'dima.ali@example.com',     '+961-70-000-119', 'applied',     3, NULL, 'I want guided learning and code reviews to improve quickly.'),
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
    'program_id', (SELECT id::text FROM programs WHERE slug='full-stack'),
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
    (SELECT id FROM users WHERE email='omar.nasser@example.com' ORDER BY id ASC LIMIT 1),
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
    (SELECT id FROM users WHERE email='leila.farah@example.com' ORDER BY id ASC LIMIT 1),
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
    (SELECT id FROM users WHERE email='rana.tarek@example.com' ORDER BY id ASC LIMIT 1),
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
WHERE ap.status = 'accepted'
  AND ap.cohort_id = (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' LIMIT 1)
  AND lower(u.email) IN ('omar.nasser@example.com', 'leila.farah@example.com', 'rana.tarek@example.com')
ON CONFLICT (student_user_id, cohort_id) DO UPDATE SET
  application_id = EXCLUDED.application_id,
  status = EXCLUDED.status,
  enrolled_at = EXCLUDED.enrolled_at;

UPDATE applications a
SET
  stage = 'participation_confirmed',
  status = 'participation_confirmed',
  participation_confirmed_at = COALESCE(a.participation_confirmed_at, NOW())
WHERE EXISTS (
  SELECT 1
  FROM enrollments e
  WHERE e.application_id = a.id
    AND e.cohort_id = (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' LIMIT 1)
);

-- =========================================================
-- 9C) INTERVIEWS + MESSAGE DRAFTS
-- =========================================================
-- Seed interview records for active pipeline rows.
INSERT INTO interviews (
  application_id,
  scheduled_at,
  duration_minutes,
  location_type,
  location_details,
  status,
  confirm_token,
  created_by
)
SELECT
  a.id,
  NOW() + INTERVAL '3 days',
  30,
  'online',
  'Google Meet',
  CASE
    WHEN a.status = 'interview_confirmed' THEN 'confirmed'
    WHEN a.status = 'invited_to_interview' THEN 'pending_confirmation'
    ELSE 'pending_confirmation'
  END,
  md5('intv-' || a.id::text || '-seed'),
  (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
FROM applications a
WHERE a.cohort_id = (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' LIMIT 1)
  AND a.status IN ('invited_to_interview', 'interview_confirmed')
ON CONFLICT (application_id) DO UPDATE SET
  scheduled_at = EXCLUDED.scheduled_at,
  duration_minutes = EXCLUDED.duration_minutes,
  location_type = EXCLUDED.location_type,
  location_details = EXCLUDED.location_details,
  status = EXCLUDED.status,
  confirm_token = EXCLUDED.confirm_token,
  created_by = EXCLUDED.created_by,
  updated_at = NOW();

-- Seed message drafts for interview/decision communications.
INSERT INTO application_messages (
  application_id,
  channel,
  to_value,
  subject,
  body,
  template_key,
  status,
  created_by
)
SELECT
  a.id,
  'email',
  COALESCE(ap.email, a.applicant_email_norm),
  CASE
    WHEN a.status IN ('invited_to_interview', 'interview_confirmed') THEN 'Interview Invitation'
    WHEN a.status = 'rejected' THEN 'Application Update'
    ELSE 'Application Status Update'
  END,
  CASE
    WHEN a.status IN ('invited_to_interview', 'interview_confirmed') THEN 'Your interview schedule is available. Please confirm using your link.'
    WHEN a.status = 'rejected' THEN 'Thank you for applying. We are unable to proceed at this time.'
    ELSE 'Your application status has been updated.'
  END,
  CASE
    WHEN a.status IN ('invited_to_interview', 'interview_confirmed') THEN 'interview_invitation'
    WHEN a.status = 'rejected' THEN 'decision_rejected'
    ELSE 'status_update'
  END,
  'draft',
  (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
FROM applications a
LEFT JOIN applicants ap ON ap.id = a.applicant_id
WHERE a.cohort_id = (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' LIMIT 1)
  AND a.status IN ('invited_to_interview', 'interview_confirmed', 'rejected')
  AND COALESCE(ap.email, a.applicant_email_norm) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM application_messages m
    WHERE m.application_id = a.id
      AND m.template_key = CASE
        WHEN a.status IN ('invited_to_interview', 'interview_confirmed') THEN 'interview_invitation'
        WHEN a.status = 'rejected' THEN 'decision_rejected'
        ELSE 'status_update'
      END
  );

-- Add a second cohort application set so cohort switching shows data.
WITH ux_applicants(full_name, email, phone, status, stage, submitted_days, why_join) AS (
  VALUES
    ('Maya Azar', 'maya.azar@example.com', '+961-71-000-221', 'applied', 'applied', 6, 'I want to strengthen UI system thinking and product collaboration.'),
    ('Tarek Younes', 'tarek.younes@example.com', '+961-71-000-222', 'accepted', 'accepted', 12, 'I want to build portfolio-ready UX case studies with mentorship.'),
    ('Sara Khalil', 'sara.khalil@example.com', '+961-71-000-223', 'rejected', 'rejected', 10, 'I want to learn research and prototyping fundamentals quickly.')
),
ux_cohort AS (
  SELECT id
  FROM cohorts
  WHERE name = 'UI/UX — Coming Soon'
  LIMIT 1
),
admin_actor AS (
  SELECT id
  FROM users
  WHERE email = 'admin@digitalhub.com'
  LIMIT 1
)
INSERT INTO applicants (full_name, email, phone)
SELECT ua.full_name, ua.email, ua.phone
FROM ux_applicants ua
WHERE NOT EXISTS (
  SELECT 1
  FROM applicants a
  WHERE lower(a.email) = lower(ua.email)
);

WITH ux_applicants(full_name, email, phone, status, stage, submitted_days, why_join) AS (
  VALUES
    ('Maya Azar', 'maya.azar@example.com', '+961-71-000-221', 'applied', 'applied', 6, 'I want to strengthen UI system thinking and product collaboration.'),
    ('Tarek Younes', 'tarek.younes@example.com', '+961-71-000-222', 'accepted', 'accepted', 12, 'I want to build portfolio-ready UX case studies with mentorship.'),
    ('Sara Khalil', 'sara.khalil@example.com', '+961-71-000-223', 'rejected', 'rejected', 10, 'I want to learn research and prototyping fundamentals quickly.')
),
ux_cohort AS (
  SELECT id
  FROM cohorts
  WHERE name = 'UI/UX — Coming Soon'
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
  submission_answers,
  stage,
  status,
  reviewed_by,
  reviewed_at,
  submitted_at
)
SELECT
  uc.id,
  am.applicant_id,
  lower(ua.email) AS applicant_email_norm,
  regexp_replace(COALESCE(ua.phone, ''), '\D', '', 'g') AS applicant_phone_norm,
  jsonb_build_object(
    'full_name', ua.full_name,
    'email', ua.email,
    'phone', ua.phone,
    'program_id', (SELECT id::text FROM programs WHERE slug='ui-ux'),
    'why_join', ua.why_join
  ) AS submission_answers,
  ua.stage::text,
  ua.status::text,
  CASE WHEN ua.status IN ('accepted', 'rejected') THEN aa.id ELSE NULL END AS reviewed_by,
  CASE WHEN ua.status IN ('accepted', 'rejected') THEN NOW() - INTERVAL '3 days' ELSE NULL END AS reviewed_at,
  NOW() - (ua.submitted_days || ' days')::interval AS submitted_at
FROM ux_applicants ua
JOIN ux_cohort uc ON TRUE
JOIN admin_actor aa ON TRUE
JOIN applicant_map am ON am.email_norm = lower(ua.email)
ON CONFLICT (cohort_id, applicant_email_norm) WHERE applicant_email_norm IS NOT NULL DO UPDATE SET
  applicant_id = EXCLUDED.applicant_id,
  applicant_phone_norm = EXCLUDED.applicant_phone_norm,
  submission_answers = EXCLUDED.submission_answers,
  stage = EXCLUDED.stage,
  status = EXCLUDED.status,
  reviewed_by = EXCLUDED.reviewed_by,
  reviewed_at = EXCLUDED.reviewed_at,
  submitted_at = EXCLUDED.submitted_at;

WITH ux_applicants(full_name, email, phone, status, stage, submitted_days, why_join) AS (
  VALUES
    ('Maya Azar', 'maya.azar@example.com', '+961-71-000-221', 'applied', 'applied', 6, 'I want to strengthen UI system thinking and product collaboration.'),
    ('Tarek Younes', 'tarek.younes@example.com', '+961-71-000-222', 'accepted', 'accepted', 12, 'I want to build portfolio-ready UX case studies with mentorship.'),
    ('Sara Khalil', 'sara.khalil@example.com', '+961-71-000-223', 'rejected', 'rejected', 10, 'I want to learn research and prototyping fundamentals quickly.')
),
ux_cohort AS (
  SELECT id
  FROM cohorts
  WHERE name = 'UI/UX — Coming Soon'
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
    'full_name', ua.full_name,
    'email', ua.email,
    'phone', ua.phone,
    'program_id', (SELECT id::text FROM programs WHERE slug='ui-ux'),
    'why_join', ua.why_join
  )
FROM ux_applicants ua
JOIN ux_cohort uc ON TRUE
JOIN target_form tf ON TRUE
JOIN applications ap
  ON ap.cohort_id = uc.id
 AND ap.applicant_email_norm = lower(ua.email)
WHERE NOT EXISTS (
  SELECT 1
  FROM application_submissions sub
  WHERE sub.application_id = ap.id
);

-- =========================================================
-- 9D) PROGRAM APPLICATIONS (GENERAL APPLY PIPELINE)
-- =========================================================
WITH general_apply_rows(full_name, email, phone, program_slug, stage, submitted_days, why_join) AS (
  VALUES
    ('Lina Younes', 'lina.younes@example.com', '+961-03-555-222', 'full-stack', 'invited_to_interview', 8, 'I want to become job-ready by shipping real projects.'),
    ('Nadim Saleh', 'nadim.saleh@example.com', '+961-03-555-333', 'full-stack', 'reviewing', 5, 'I want mentorship and code review to improve quickly.'),
    ('Rola Najjar', 'rola.najjar@example.com', '+961-03-555-444', 'ui-ux', 'applied', 2, 'I want to improve research and prototyping skills.')
)
INSERT INTO applicants (full_name, email, phone)
SELECT gar.full_name, gar.email, gar.phone
FROM general_apply_rows gar
WHERE NOT EXISTS (
  SELECT 1
  FROM applicants a
  WHERE lower(a.email) = lower(gar.email)
);

WITH general_apply_rows(full_name, email, phone, program_slug, stage, submitted_days, why_join) AS (
  VALUES
    ('Lina Younes', 'lina.younes@example.com', '+961-03-555-222', 'full-stack', 'invited_to_interview', 8, 'I want to become job-ready by shipping real projects.'),
    ('Nadim Saleh', 'nadim.saleh@example.com', '+961-03-555-333', 'full-stack', 'reviewing', 5, 'I want mentorship and code review to improve quickly.'),
    ('Rola Najjar', 'rola.najjar@example.com', '+961-03-555-444', 'ui-ux', 'applied', 2, 'I want to improve research and prototyping skills.')
),
applicant_map AS (
  SELECT lower(email) AS email_norm, MAX(id) AS applicant_id
  FROM applicants
  GROUP BY lower(email)
)
INSERT INTO program_applications (
  program_id,
  cohort_id,
  applicant_id,
  applicant_email_norm,
  applicant_phone_norm,
  submission_answers,
  stage,
  reviewed_by,
  reviewed_at,
  review_message,
  created_at,
  updated_at
)
SELECT
  p.id AS program_id,
  CASE WHEN gar.program_slug = 'full-stack'
       THEN (SELECT id FROM cohorts WHERE name = 'Full Stack — Spring 2026' LIMIT 1)
       ELSE NULL
  END AS cohort_id,
  am.applicant_id,
  lower(gar.email) AS applicant_email_norm,
  regexp_replace(COALESCE(gar.phone, ''), '\D', '', 'g') AS applicant_phone_norm,
  jsonb_build_object(
    'full_name', gar.full_name,
    'email', gar.email,
    'phone', gar.phone,
    'program_id', p.id::text,
    'why_join', gar.why_join
  ) AS submission_answers,
  gar.stage::text,
  CASE WHEN gar.stage IN ('reviewing', 'invited_to_interview', 'interview_confirmed', 'accepted', 'rejected', 'participation_confirmed')
       THEN (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
       ELSE NULL
  END AS reviewed_by,
  CASE WHEN gar.stage IN ('reviewing', 'invited_to_interview', 'interview_confirmed', 'accepted', 'rejected', 'participation_confirmed')
       THEN NOW() - INTERVAL '1 day'
       ELSE NULL
  END AS reviewed_at,
  CASE WHEN gar.stage = 'invited_to_interview' THEN 'Interview invite drafted'
       WHEN gar.stage = 'reviewing' THEN 'Under review'
       ELSE NULL
  END AS review_message,
  NOW() - (gar.submitted_days || ' days')::interval AS created_at,
  NOW() - (gar.submitted_days || ' days')::interval AS updated_at
FROM general_apply_rows gar
JOIN programs p ON p.slug = gar.program_slug
JOIN applicant_map am ON am.email_norm = lower(gar.email)
ON CONFLICT (program_id, applicant_email_norm) WHERE applicant_email_norm IS NOT NULL DO UPDATE SET
  cohort_id = EXCLUDED.cohort_id,
  applicant_id = EXCLUDED.applicant_id,
  applicant_phone_norm = EXCLUDED.applicant_phone_norm,
  submission_answers = EXCLUDED.submission_answers,
  stage = EXCLUDED.stage,
  reviewed_by = EXCLUDED.reviewed_by,
  reviewed_at = EXCLUDED.reviewed_at,
  review_message = EXCLUDED.review_message,
  updated_at = NOW();

-- Program-application interview rows (for token confirm/reschedule flows).
UPDATE interviews i
SET
  scheduled_at = NOW() + INTERVAL '2 days',
  duration_minutes = 30,
  location_type = 'online',
  location_details = 'Google Meet',
  status = CASE WHEN pa.stage = 'interview_confirmed' THEN 'confirmed' ELSE 'pending_confirmation' END,
  confirm_token = md5('program-intv-' || pa.id::text || '-seed'),
  created_by = (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
  updated_at = NOW()
FROM program_applications pa
WHERE i.program_application_id = pa.id
  AND pa.applicant_email_norm = lower('lina.younes@example.com');

INSERT INTO interviews (
  application_id,
  program_application_id,
  scheduled_at,
  duration_minutes,
  location_type,
  location_details,
  status,
  confirm_token,
  created_by
)
SELECT
  NULL,
  pa.id,
  NOW() + INTERVAL '2 days',
  30,
  'online',
  'Google Meet',
  CASE WHEN pa.stage = 'interview_confirmed' THEN 'confirmed' ELSE 'pending_confirmation' END,
  md5('program-intv-' || pa.id::text || '-seed'),
  (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
FROM program_applications pa
WHERE pa.applicant_email_norm = lower('lina.younes@example.com')
  AND NOT EXISTS (
    SELECT 1
    FROM interviews i
    WHERE i.program_application_id = pa.id
  );

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
    (SELECT id FROM cohorts WHERE name='Full Stack — Spring 2026' ORDER BY id ASC LIMIT 1),
    FALSE,
    TRUE,
    NOW(),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  (
    'UI/UX Cohort Coming Soon',
    'Our UI/UX cohort is coming soon. Follow announcements for opening dates.',
    'website',
    (SELECT id FROM cohorts WHERE name='UI/UX — Coming Soon' ORDER BY id ASC LIMIT 1),
    TRUE,
    TRUE,
    NOW(),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
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
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
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
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
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

-- Completed event with post content + gallery images
INSERT INTO events (
  slug, title, description, post_body, location,
  starts_at, ends_at, is_published, is_done, done_at,
  auto_announce, completion_image_urls, featured_image_url, created_by
)
VALUES
  (
    'alumni-demo-day-2025',
    'Alumni Demo Day 2025',
    'A completed showcase event where alumni teams presented production-ready products to hiring partners and mentors.',
    'Alumni Demo Day 2025 concluded with capstone demos, recruiter Q&A panels, and portfolio reviews. Teams presented full-stack, UI/UX, and automation projects, followed by 1:1 networking with partner companies.',
    'Digital Hub Main Campus, Beirut',
    '2025-11-12T15:00:00.000Z',
    '2025-11-12T18:30:00.000Z',
    TRUE,
    TRUE,
    '2025-11-12T19:00:00.000Z',
    FALSE,
    '["/assets/img/events/event_details_img.jpg","/assets/img/events/event_details_img02.jpg","/assets/img/events/event_thumb08.jpg"]'::jsonb,
    '/assets/img/events/event_thumb07.jpg',
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  )
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title,
  description=EXCLUDED.description,
  post_body=EXCLUDED.post_body,
  location=EXCLUDED.location,
  starts_at=EXCLUDED.starts_at,
  ends_at=EXCLUDED.ends_at,
  is_published=EXCLUDED.is_published,
  is_done=EXCLUDED.is_done,
  done_at=EXCLUDED.done_at,
  auto_announce=EXCLUDED.auto_announce,
  completion_image_urls=EXCLUDED.completion_image_urls,
  featured_image_url=EXCLUDED.featured_image_url,
  updated_at=NOW();

-- Two additional completed events with full post details and gallery images
INSERT INTO events (
  slug, title, description, post_body, location,
  starts_at, ends_at, is_published, is_done, done_at,
  auto_announce, completion_image_urls, featured_image_url, created_by
)
VALUES
  (
    'design-sprint-showcase-2025',
    'Design Sprint Showcase 2025',
    'A completed design sprint showcase featuring UX case studies, user testing insights, and prototype demos.',
    'Design Sprint Showcase 2025 brought together product mentors and design teams for final critiques. Participants presented problem statements, user journeys, hi-fidelity prototypes, and usability testing findings, followed by feedback sessions with partner companies.',
    'Digital Hub Creative Lab, Beirut',
    '2025-09-18T14:00:00.000Z',
    '2025-09-18T17:30:00.000Z',
    TRUE,
    TRUE,
    '2025-09-18T18:00:00.000Z',
    FALSE,
    '["/assets/img/events/event_thumb05.jpg","/assets/img/events/event_thumb06.jpg","/assets/img/events/event_details_img.jpg"]'::jsonb,
    '/assets/img/events/h4_event_thumb02.jpg',
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  ),
  (
    'automation-bootcamp-wrapup-2025',
    'Automation Bootcamp Wrap-up 2025',
    'A completed graduation event for the automation track with project walkthroughs and mentor-led retrospectives.',
    'Automation Bootcamp Wrap-up 2025 concluded with end-to-end workflow demos, API integration showcases, and deployment reviews. Learners demonstrated automation pipelines for CRM sync, messaging workflows, and reporting dashboards before the final certification ceremony.',
    'Digital Hub Operations Hall, Beirut',
    '2025-10-22T13:30:00.000Z',
    '2025-10-22T16:45:00.000Z',
    TRUE,
    TRUE,
    '2025-10-22T17:15:00.000Z',
    FALSE,
    '["/assets/img/events/event_thumb07.jpg","/assets/img/events/event_thumb08.jpg","/assets/img/events/event_details_img02.jpg"]'::jsonb,
    '/assets/img/events/h4_event_thumb03.jpg',
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  )
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title,
  description=EXCLUDED.description,
  post_body=EXCLUDED.post_body,
  location=EXCLUDED.location,
  starts_at=EXCLUDED.starts_at,
  ends_at=EXCLUDED.ends_at,
  is_published=EXCLUDED.is_published,
  is_done=EXCLUDED.is_done,
  done_at=EXCLUDED.done_at,
  auto_announce=EXCLUDED.auto_announce,
  completion_image_urls=EXCLUDED.completion_image_urls,
  featured_image_url=EXCLUDED.featured_image_url,
  updated_at=NOW();

-- =========================================================
-- 12) CONTACT MESSAGES (visitor + recruiter visit request)
-- =========================================================
INSERT INTO contact_messages (
  name, email, phone, subject, message, kind,
  company_name, company_role, linkedin_url, visit_preferred_dates, visit_notes,
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
    NULL, NULL, NULL, NULL, NULL,
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
    'https://linkedin.com/in/recruiter-a',
    'Next two weeks (weekday mornings)',
    'Interested in meeting Full Stack cohort students.',
    'new',
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1)
  )
ON CONFLICT DO NOTHING;

-- =========================================================
-- 13) LOGS + ADMIN NOTIFICATIONS (demo examples)
-- =========================================================
-- Log an example action
INSERT INTO activity_logs (actor_user_id, action, entity_type, entity_id, message, metadata)
VALUES (
  (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
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
  (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
  l.id,
  'Seed completed',
  'Seed data inserted successfully.'
FROM activity_logs l
WHERE l.action='SEED_DATA_INSERTED'
ORDER BY l.created_at DESC
LIMIT 1;

INSERT INTO projects (
  student_user_id, title, description, image_url, github_url, live_url, is_public, sort_order
)
VALUES (
  (SELECT id FROM users WHERE email='student@digitalhub.com' ORDER BY id ASC LIMIT 1),
  'Digital Hub Admin Dashboard',
  'Admin dashboard UI with sidebar routing, CMS pages, and clean card/table layouts.',
  'https://your-cdn.com/screenshots/digitalhub-dashboard.png',
  'https://github.com/Zahraa-Salim/digital-hub-dashboard',
  'https://your-live-demo.com',
  TRUE,
  1
)
ON CONFLICT (student_user_id, github_url) DO NOTHING;

-- =========================================================
-- 14) HOME SECTION ORDER + MISSING SECTIONS (featured/newsletter)
-- =========================================================
INSERT INTO home_sections (key, title, is_enabled, sort_order, content, updated_by, updated_at)
VALUES
  (
    'featured_participants',
    'Featured Participants',
    TRUE,
    4,
    jsonb_build_object(
      'subtitle', 'Featured Participants',
      'title', 'Meet Active Participants Building Real Work',
      'description', 'Explore active students currently building projects, growing their skills, and contributing across Digital Hub programs.',
      'limit', 3,
      'cta_text', 'View All Participants',
      'cta_link', '/participants'
    ),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    NOW()
  ),
  (
    'newsletter',
    'Newsletter',
    TRUE,
    5,
    jsonb_build_object(
      'title', 'Stay Updated',
      'description', 'Get updates on openings, events, and opportunities.',
      'button_text', 'Subscribe'
    ),
    (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
    NOW()
  )
ON CONFLICT (key) DO UPDATE
SET
  title = EXCLUDED.title,
  is_enabled = EXCLUDED.is_enabled,
  sort_order = EXCLUDED.sort_order,
  content = EXCLUDED.content,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

UPDATE home_sections hs
SET
  sort_order = ordered.sort_order,
  updated_by = (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
  updated_at = NOW()
FROM (
  VALUES
    ('hero', 1),
    ('about', 2),
    ('programs', 3),
    ('featured_participants', 4),
    ('newsletter', 5),
    ('team', 6),
    ('announcements', 7),
    ('features', 8),
    ('apply_cta', 9)
) AS ordered(key, sort_order)
WHERE hs.key = ordered.key;

UPDATE home_sections
SET
  content = jsonb_set(COALESCE(content, '{}'::jsonb), '{limit}', to_jsonb(3), true),
  updated_by = (SELECT id FROM users WHERE email='admin@digitalhub.com' ORDER BY id ASC LIMIT 1),
  updated_at = NOW()
WHERE key = 'team';

COMMIT;


-- Done.
-- Login demo credentials (if using SQL-created bcrypt):
--   admin@digitalhub.com / ChangeMe123!
--   instructor@digitalhub.com / ChangeMe123!
--   student@digitalhub.com / ChangeMe123!
--
-- IMPORTANT: Change passwords immediately in production.




