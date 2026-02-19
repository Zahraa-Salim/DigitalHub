# Digital Hub — PostgreSQL Database Schema (Updated + Logs & Admin Notifications)

This document updates the database schema to include:
✅ **Activity Logs** (every important action is recorded)  
✅ **Admin Notifications** (each log event can generate a notification shown in Admin Dashboard)  
✅ Notifications are **saved** and can be marked **read**.

It keeps your latest decisions:
- No student/instructor dashboards (profiles exist, managed by admin)
- Multi-role users via flags: `is_admin`, `is_instructor`, `is_student`
- Programs = templates, Cohorts = real runs
- No sessions/attendance
- Announcements can appear on website
- Contact messages include visitors + companies/recruiters visit requests
- Theme tokens stored with purpose + variable name

---

## 1) Users (Multi-role Flags)

### `users`
- `id BIGSERIAL PRIMARY KEY`
- `email TEXT UNIQUE`
- `phone TEXT UNIQUE`
- `password_hash TEXT NOT NULL`

Role flags:
- `is_admin BOOLEAN NOT NULL DEFAULT FALSE`
- `is_instructor BOOLEAN NOT NULL DEFAULT FALSE`
- `is_student BOOLEAN NOT NULL DEFAULT FALSE`

Account:
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `last_login_at TIMESTAMPTZ`

Audit:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## 2) Profiles (Editable + Optional Social Links + Website Visibility)

All profiles include:
- `linkedin_url TEXT NULL`
- `github_url TEXT NULL`
- `portfolio_url TEXT NULL`

### `student_profiles`
- `user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
- `full_name TEXT NOT NULL`
- `avatar_url TEXT`
- `bio TEXT`
- `linkedin_url TEXT`
- `github_url TEXT`
- `portfolio_url TEXT`

Website controls:
- `is_public BOOLEAN NOT NULL DEFAULT FALSE` ✅ admin decides show or hide
- `featured BOOLEAN NOT NULL DEFAULT FALSE`
- `featured_rank INTEGER`
- `public_slug TEXT UNIQUE` (recommended for public URLs)

- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `instructor_profiles`
- `user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
- `full_name TEXT NOT NULL`
- `avatar_url TEXT`
- `bio TEXT`
- `expertise TEXT`
- `linkedin_url TEXT`
- `github_url TEXT`
- `portfolio_url TEXT`

Website controls:
- `is_public BOOLEAN NOT NULL DEFAULT FALSE` ✅ admin decides show or hide

- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `manager_profiles` (admins shown publicly)
- `user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
- `full_name TEXT NOT NULL`
- `avatar_url TEXT`
- `bio TEXT`
- `job_title TEXT`
- `linkedin_url TEXT`
- `github_url TEXT`
- `portfolio_url TEXT`

Website controls:
- `is_public BOOLEAN NOT NULL DEFAULT TRUE`
- `sort_order INTEGER NOT NULL DEFAULT 0`

- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- A manager should have `users.is_admin=true`.
- `manager_profiles.is_public` controls visibility on the website.

---

## 3) Site CMS

### `site_settings` (one row)
- `id SMALLINT PRIMARY KEY DEFAULT 1`
- `site_name TEXT NOT NULL DEFAULT 'Digital Hub'`
- `default_event_location TEXT NOT NULL DEFAULT 'Digital Hub'`
- `contact_info JSONB NOT NULL DEFAULT '{}'::jsonb`
- `social_links JSONB NOT NULL DEFAULT '{}'::jsonb`
- `updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `theme_tokens`
- `id BIGSERIAL PRIMARY KEY`
- `key TEXT UNIQUE NOT NULL`            (CSS variable name: `--bg`, `--text`, `--primary`)
- `purpose TEXT NOT NULL`               (human meaning: Background, Text, Primary button)
- `value TEXT NOT NULL`                 (hex/rgb: `#0b0f19`)
- `scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','web','admin'))`
- `updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `pages`
- `id BIGSERIAL PRIMARY KEY`
- `key TEXT UNIQUE NOT NULL`
- `title TEXT`
- `content JSONB NOT NULL DEFAULT '{}'::jsonb`
- `is_published BOOLEAN NOT NULL DEFAULT TRUE`
- `updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `home_sections`
- `id BIGSERIAL PRIMARY KEY`
- `key TEXT UNIQUE NOT NULL`
- `title TEXT`
- `is_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `content JSONB NOT NULL DEFAULT '{}'::jsonb`
- `updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Index:
- `(is_enabled, sort_order)`

---

## 4) Programs (Template) + Cohorts (Real Runs)

### `programs` (template only)
- `id BIGSERIAL PRIMARY KEY`
- `slug TEXT UNIQUE NOT NULL`
- `title TEXT NOT NULL`
- `summary TEXT`
- `description TEXT`
- `requirements TEXT`
- `default_capacity INTEGER CHECK (default_capacity >= 0)`
- `is_published BOOLEAN NOT NULL DEFAULT TRUE`
- `created_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `cohorts` (real run of a program)
- `id BIGSERIAL PRIMARY KEY`
- `program_id BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE`
- `name TEXT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'planned'
   CHECK (status IN ('planned','coming_soon','open','running','completed','cancelled'))`

Enrollment:
- `allow_applications BOOLEAN NOT NULL DEFAULT FALSE`
- `capacity INTEGER CHECK (capacity >= 0)`
- `enrollment_open_at TIMESTAMPTZ`
- `enrollment_close_at TIMESTAMPTZ`

Dates:
- `start_date DATE`
- `end_date DATE`

- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `cohort_instructors`
- `cohort_id BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE`
- `instructor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `cohort_role TEXT NOT NULL DEFAULT 'instructor'`
- PRIMARY KEY (cohort_id, instructor_user_id)

---

## 5) Events (with Done Flag)

### `events`
- `id BIGSERIAL PRIMARY KEY`
- `slug TEXT UNIQUE NOT NULL`
- `title TEXT NOT NULL`
- `description TEXT`
- `location TEXT`
- `starts_at TIMESTAMPTZ NOT NULL`
- `ends_at TIMESTAMPTZ`
- `is_published BOOLEAN NOT NULL DEFAULT FALSE`

Done tracking:
- `is_done BOOLEAN NOT NULL DEFAULT FALSE`
- `done_at TIMESTAMPTZ`

- `created_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## 6) Forms (Dynamic Fields)

### `forms`
- `id BIGSERIAL PRIMARY KEY`
- `key TEXT UNIQUE NOT NULL`  (ex: `cohort_application`, `contact`)
- `title TEXT`
- `description TEXT`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `form_fields`
- `id BIGSERIAL PRIMARY KEY`
- `form_id BIGINT NOT NULL REFERENCES forms(id) ON DELETE CASCADE`
- `name TEXT NOT NULL`
- `label TEXT NOT NULL`
- `type TEXT NOT NULL CHECK (type IN ('text','textarea','email','phone','select','checkbox','date','file'))`
- `required BOOLEAN NOT NULL DEFAULT FALSE`
- `options JSONB`
- `placeholder TEXT`
- `min_length INTEGER`
- `max_length INTEGER`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `is_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- UNIQUE (form_id, name)

---

## 7) Applications (Visitor applies to cohort)

### `applicants`
- `id BIGSERIAL PRIMARY KEY`
- `full_name TEXT`
- `email TEXT`
- `phone TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `applications`
- `id BIGSERIAL PRIMARY KEY`
- `cohort_id BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE`
- `applicant_id BIGINT REFERENCES applicants(id) ON DELETE SET NULL`

- `status TEXT NOT NULL DEFAULT 'pending'
   CHECK (status IN ('pending','approved','rejected','waitlisted'))`
- `reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `reviewed_at TIMESTAMPTZ`
- `submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### `application_submissions`
- `id BIGSERIAL PRIMARY KEY`
- `application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `form_id BIGINT NOT NULL REFERENCES forms(id) ON DELETE RESTRICT`
- `answers JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## 8) Enrollments (Created by admin approval)

### `enrollments`
- `id BIGSERIAL PRIMARY KEY`
- `student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `cohort_id BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE`
- `application_id BIGINT UNIQUE REFERENCES applications(id) ON DELETE SET NULL`

- `status TEXT NOT NULL DEFAULT 'active'
   CHECK (status IN ('active','paused','completed','dropped'))`
- `enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Constraint:
- UNIQUE (student_user_id, cohort_id)

---

## 9) Announcements (can appear on website)

### `announcements`
- `id BIGSERIAL PRIMARY KEY`
- `title TEXT NOT NULL`
- `body TEXT NOT NULL`

Targeting:
- `target_audience TEXT NOT NULL DEFAULT 'all'
   CHECK (target_audience IN ('all','website','admin'))`
  NOTE: since you removed student/instructor dashboards, we keep only what you need now.

Scope:
- `cohort_id BIGINT REFERENCES cohorts(id) ON DELETE CASCADE` (nullable)

Publication:
- `is_auto BOOLEAN NOT NULL DEFAULT FALSE`
- `is_published BOOLEAN NOT NULL DEFAULT TRUE`
- `publish_at TIMESTAMPTZ`

- `created_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## 10) Contact Messages (Visitors + Companies/Recruiters Visit Requests)

### `contact_messages`
- `id BIGSERIAL PRIMARY KEY`
- `name TEXT NOT NULL`
- `email TEXT NOT NULL`
- `phone TEXT`
- `subject TEXT`
- `message TEXT NOT NULL`

Category:
- `kind TEXT NOT NULL DEFAULT 'question'
   CHECK (kind IN ('question','visit_request','feedback'))` 

Company fields (nullable):
- `company_name TEXT`
- `company_role TEXT` (ex: recruiter, HR, manager)
- `visit_preferred_dates TEXT` (or JSONB if you want structured)
- `visit_notes TEXT`

Workflow:
- `status TEXT NOT NULL DEFAULT 'new'
   CHECK (status IN ('new','in_progress','resolved'))`
- `assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL`

Email tracking (optional but recommended):
- `last_replied_at TIMESTAMPTZ`

- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `resolved_at TIMESTAMPTZ`

---

# 11) NEW: Logs + Admin Notifications ✅

## 11.1 `activity_logs`
Purpose: store a permanent history of important actions (audit trail).

Columns:
- `id BIGSERIAL PRIMARY KEY`
- `actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL`  (who did it)
- `action TEXT NOT NULL`  (short code, ex: `COHORT_CREATED`, `APPLICATION_APPROVED`)
- `entity_type TEXT NOT NULL`  (ex: `cohort`, `application`, `user`, `theme_token`)
- `entity_id BIGINT`  (id of entity if applicable)
- `message TEXT NOT NULL`  (human readable summary)
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb` (extra details)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Indexes:
- index on `created_at`
- index on `(entity_type, entity_id)`
- index on `actor_user_id`

Examples of actions to log:
- admin login
- create/update/delete program
- create/update cohort
- change cohort status
- approve/reject application
- create enrollment
- edit pages/home sections/site settings/theme tokens
- create announcement/event
- reply to contact message

---

## 11.2 `admin_notifications`
Purpose: show notifications in Admin Dashboard (unread/read), backed by logs.

Columns:
- `id BIGSERIAL PRIMARY KEY`
- `recipient_admin_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `log_id BIGINT REFERENCES activity_logs(id) ON DELETE CASCADE` ✅ link to log event
- `title TEXT NOT NULL`       (ex: "New application submitted")
- `body TEXT`                 (short preview)
- `is_read BOOLEAN NOT NULL DEFAULT FALSE`
- `read_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Indexes:
- index on `(recipient_admin_user_id, is_read, created_at)`

Notes:
- If you have multiple admins, you can create one notification per admin.
- If you want “notify only specific admins”, choose recipients in server logic.

---

## 11.3 How logs → notifications works (implementation note)
Recommended server rule:
- Every time you insert an `activity_logs` row:
  - also insert `admin_notifications` rows for all admins (or chosen admins)
- This is best done in server code (not SQL trigger) so you can control recipients.

---

# 12) Tables Summary

Users:
- `users`

Profiles:
- `student_profiles`
- `instructor_profiles`
- `manager_profiles`

CMS:
- `site_settings`
- `theme_tokens`
- `pages`
- `home_sections`

Programs/Cohorts:
- `programs`
- `cohorts`
- `cohort_instructors`

Events:
- `events`

Forms:
- `forms`
- `form_fields`

Applications:
- `applicants`
- `applications`
- `application_submissions`

Enrollments:
- `enrollments`

Comms:
- `announcements`
- `contact_messages`

Audit/Notifications:
- `activity_logs`
- `admin_notifications`
