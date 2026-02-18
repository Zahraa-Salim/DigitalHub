# Digital Hub — PostgreSQL Database Schema (Updated Proposal)

This document defines a **complete, team-ready** PostgreSQL schema for the Digital Hub project (updated per your notes).
It supports:
- Public website content fully stored in DB (pages + home sections)
- Programs (basic templates) + Cohorts (actual runs)
- Multi-role users (admin/instructor/student simultaneously)
- Profiles with optional LinkedIn/GitHub/Portfolio links
- Manager profiles (managers appear on the public website)
- Theme colors stored with purpose + CSS variable name
- Events (with done/completed flag)
- Sessions (calendar-like schedule) linked to cohorts, with onsite/remote, day plan, unusual flags
- Attendance records linked to sessions (Phase 2 supported)
- Announcements targeting: student/instructor/admin AND website visitors

---

## 0) Conventions

### 0.1 Primary keys
- Use `BIGSERIAL` for most tables.

### 0.2 Timestamps
- Prefer `TIMESTAMPTZ` (timezone-aware).
- Standard columns:
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ DEFAULT NOW()`

### 0.3 Public vs private data
Public endpoints must never expose:
- password hashes
- admin-only notes
- private contact data (unless you explicitly allow it)

---

# 1) Users & Roles (Multi-role)

## 1.1 `users`
Users can be **admin + instructor** at the same time, etc.
Instead of a single `role`, we store booleans.

Columns:
- `id BIGSERIAL PRIMARY KEY`
- `email TEXT UNIQUE` (nullable if you later allow phone-only login)
- `phone TEXT UNIQUE` (nullable)
- `password_hash TEXT NOT NULL`

Role flags:
- `is_admin BOOLEAN NOT NULL DEFAULT FALSE`
- `is_instructor BOOLEAN NOT NULL DEFAULT FALSE`
- `is_student BOOLEAN NOT NULL DEFAULT FALSE`

Account flags:
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `last_login_at TIMESTAMPTZ`

Audit:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- Role management happens in the admin dashboard by toggling these flags.
- Your API middleware becomes:
  - `requireAuth`
  - `requireAdmin` checks `is_admin=true`
  - `requireInstructor` checks `is_instructor=true`
  - `requireStudent` checks `is_student=true`

---

# 2) Profiles (All have optional social links)

You asked: all profiles contain `linkedin`, `github`, `portfolio` (nullable).

## 2.1 `student_profiles`
Columns:
- `user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
- `full_name TEXT NOT NULL`
- `avatar_url TEXT`
- `bio TEXT`

Social links (nullable):
- `linkedin_url TEXT`
- `github_url TEXT`
- `portfolio_url TEXT`

Public flags:
- `status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','graduated'))`
- `featured BOOLEAN NOT NULL DEFAULT FALSE`
- `featured_rank INTEGER`
- `public_slug TEXT UNIQUE` (recommended for public student detail URLs)

Audit:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- Public website uses safe fields only (name/avatar/bio/social links if you allow them).

## 2.2 `instructor_profiles`
Columns:
- `user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
- `full_name TEXT NOT NULL`
- `avatar_url TEXT`
- `bio TEXT`
- `expertise TEXT`

Social links (nullable):
- `linkedin_url TEXT`
- `github_url TEXT`
- `portfolio_url TEXT`

Audit:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## 2.3 `manager_profiles` ✅ (New)
Managers are admins that should appear on the public website.

Columns:
- `user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
- `full_name TEXT NOT NULL`
- `avatar_url TEXT`
- `bio TEXT`
- `job_title TEXT` (e.g., "Program Manager", "Operations Manager")
- `is_public BOOLEAN NOT NULL DEFAULT TRUE` ✅ controls visibility on website
- `sort_order INTEGER NOT NULL DEFAULT 0`

Social links (nullable):
- `linkedin_url TEXT`
- `github_url TEXT`
- `portfolio_url TEXT`

Audit:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- The user must have `users.is_admin=true`, but being public is controlled by `manager_profiles.is_public`.
- Public website endpoint `/public/managers` reads from `manager_profiles` where `is_public=true`.

---

# 3) Site CMS (All website content stored in DB)

## 3.1 `site_settings` (1-row table)
Purpose: global site configuration + default values.

Columns:
- `id SMALLINT PRIMARY KEY DEFAULT 1`
- `site_name TEXT NOT NULL DEFAULT 'Digital Hub'`
- `default_event_location TEXT NOT NULL DEFAULT 'Digital Hub'`
- `contact_info JSONB NOT NULL DEFAULT '{}'::jsonb`
- `social_links JSONB NOT NULL DEFAULT '{}'::jsonb`
- `updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### Explanation of `site_settings` (you asked for this)
- **One row only**: it stores configuration for the whole website.
- `id=1` means you keep exactly one row and always update it instead of inserting new rows.
- `default_event_location`: if an event has no location saved, the frontend/API uses this as fallback.
- `contact_info` (JSON): store address/phone/email in one object, example:
  - `{ "address": "Beirut...", "phone": "+961...", "email": "info@..." }`
- `social_links` (JSON): store links in one object, example:
  - `{ "facebook": "...", "instagram": "...", "linkedin": "..." }`
- `updated_by`: which admin user edited settings.
- `updated_at`: last time settings were updated.

---

## 3.2 Theme colors stored with purpose + variable name ✅
Instead of storing theme as one JSON, we store it as rows so it’s easy to manage.

### `theme_tokens`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `key TEXT UNIQUE NOT NULL` ✅ CSS variable name, e.g. `--bg`, `--text`, `--primary`
- `purpose TEXT NOT NULL` ✅ human meaning, e.g. `Background`, `Text`, `Primary button`
- `value TEXT NOT NULL` ✅ hex/rgb, e.g. `#0b0f19`
- `scope TEXT NOT NULL DEFAULT 'global'` CHECK (scope IN ('global','web','admin'))
- `updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- Frontend fetches `theme_tokens` and applies:
  - `document.documentElement.style.setProperty(token.key, token.value)`
- `scope` lets you have separate themes for web vs admin if needed.

---

## 3.3 `pages`
Stores full page content (About, Contact, etc.)

Columns:
- `id BIGSERIAL PRIMARY KEY`
- `key TEXT UNIQUE NOT NULL` (e.g., `home`, `about`, `contact`)
- `title TEXT`
- `content JSONB NOT NULL DEFAULT '{}'::jsonb`
- `is_published BOOLEAN NOT NULL DEFAULT TRUE`
- `updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

## 3.4 `home_sections`
Home page sections toggled on/off and ordered.

Columns:
- `id BIGSERIAL PRIMARY KEY`
- `key TEXT UNIQUE NOT NULL` (e.g., `hero`, `programs_preview`, `featured_students`)
- `title TEXT`
- `is_enabled BOOLEAN NOT NULL DEFAULT TRUE`
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `content JSONB NOT NULL DEFAULT '{}'::jsonb`
- `updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Index:
- `(is_enabled, sort_order)`

---

# 4) Programs vs Cohorts ✅ (Updated model)

You requested a better separation:
- **Programs** = template/basic info (name, summary, requirements…)
- **Cohorts** = the real run (status, dates, instructors, students)

This is a very good design.

## 4.1 `programs` (Template only)
Columns:
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

Notes:
- No status here.
- Cohorts control status/dates/applications.

## 4.2 `cohorts` (Actual run of a program)
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `program_id BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE`
- `name TEXT NOT NULL` (e.g., "Spring 2026")
- `status TEXT NOT NULL DEFAULT 'planned'
   CHECK (status IN ('planned','coming_soon','open','running','completed','cancelled'))`

Enrollment rules:
- `allow_applications BOOLEAN NOT NULL DEFAULT FALSE`
- `capacity INTEGER CHECK (capacity >= 0)`
- `enrollment_open_at TIMESTAMPTZ`
- `enrollment_close_at TIMESTAMPTZ`

Dates:
- `start_date DATE`
- `end_date DATE`

Audit:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- Your “coming soon no application now” rule belongs here:
  - `status='coming_soon'` and `allow_applications=false`
- Visitor applies to **cohort**, not program.

## 4.3 `cohort_instructors` (Instructor assignment moved to cohorts)
Columns:
- `cohort_id BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE`
- `instructor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `cohort_role TEXT NOT NULL DEFAULT 'instructor'` (lead/assistant/mentor)
- PRIMARY KEY (`cohort_id`, `instructor_user_id`)

Notes:
- Better than program-level assignment when each cohort can have different instructors.

---

# 5) Events ✅ (Add done/completed flag)

## 5.1 `events`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `slug TEXT UNIQUE NOT NULL`
- `title TEXT NOT NULL`
- `description TEXT`
- `location TEXT` (fallback to site default if empty)
- `starts_at TIMESTAMPTZ NOT NULL`
- `ends_at TIMESTAMPTZ`
- `is_published BOOLEAN NOT NULL DEFAULT FALSE`

Done tracking:
- `is_done BOOLEAN NOT NULL DEFAULT FALSE` ✅ (or you can auto-calc: ends_at < now)
- `done_at TIMESTAMPTZ`

Audit:
- `created_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- You can compute done automatically from `ends_at`, but the flag is useful for manual override.

---

# 6) Dynamic Forms (Admin chooses fields)

## 6.1 `forms`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `key TEXT UNIQUE NOT NULL` (e.g., `cohort_application`, `contact`)
- `title TEXT`
- `description TEXT`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

## 6.2 `form_fields`
Columns:
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
- UNIQUE (`form_id`, `name`)

Notes:
- You can have default fields (name/email/phone) and allow admin to add more fields.

---

# 7) Applications (Visitor applies to a COHORT)

## 7.1 `applicants`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `full_name TEXT`
- `email TEXT`
- `phone TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

## 7.2 `applications`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `cohort_id BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE`
- `applicant_id BIGINT REFERENCES applicants(id) ON DELETE SET NULL`

- `status TEXT NOT NULL DEFAULT 'pending'
   CHECK (status IN ('pending','approved','rejected','waitlisted'))`
- `reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `reviewed_at TIMESTAMPTZ`
- `submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- Duplicate prevention:
  - (applicant_id, cohort_id) with status in pending/approved/waitlisted.

## 7.3 `application_submissions`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE`
- `form_id BIGINT NOT NULL REFERENCES forms(id) ON DELETE RESTRICT`
- `answers JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

# 8) Enrollments (Students assigned to cohorts)

## 8.1 `enrollments`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `cohort_id BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE`
- `application_id BIGINT UNIQUE REFERENCES applications(id) ON DELETE SET NULL`

- `status TEXT NOT NULL DEFAULT 'active'
   CHECK (status IN ('active','paused','completed','dropped'))`
- `enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Constraints:
- UNIQUE (`student_user_id`, `cohort_id`)

Notes:
- Instructor/student association is through cohorts.

---

# 9) Sessions (Calendar / Day Plan) ✅

You requested:
- calendar-like schedule
- day description (remote/on-site)
- what is done in this day (agenda)
- unusual/visitor/normal flags
- referred to cohort

## 9.1 `sessions`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `cohort_id BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE`

Scheduling:
- `date DATE NOT NULL` ✅ easy calendar grouping
- `starts_at TIME` (optional)
- `ends_at TIME` (optional)

Delivery & location:
- `delivery_mode TEXT NOT NULL DEFAULT 'onsite' CHECK (delivery_mode IN ('onsite','remote','hybrid'))`
- `location TEXT` (optional; if onsite and null, you can use Digital Hub address from site_settings)

Content:
- `title TEXT NOT NULL`
- `day_plan TEXT` ✅ what is done in this day (agenda/plan)
- `description TEXT` (extra notes)

Special flags:
- `session_type TEXT NOT NULL DEFAULT 'normal'
   CHECK (session_type IN ('normal','visitor','unusual','exam','workshop'))`

Audit:
- `created_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Notes:
- This supports calendar UI in student/instructor dashboards.
- Use `date` for month/week calendar and `starts_at/ends_at` for schedule.

---

# 10) Attendance (Phase 2) ✅

Attendance records refer to sessions (good design). Phase 2 keeps flexibility.

## 10.1 `attendance_records`
Columns:
- `session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE`
- `enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE`

Attendance:
- `status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused'))`
- `note TEXT`
- `marked_by BIGINT REFERENCES users(id) ON DELETE SET NULL` (instructor)
- `marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Primary key:
- PRIMARY KEY (`session_id`, `enrollment_id`)

Optional student check-in (later):
- `attendance_checkins` table with session code, etc.

---

# 11) Announcements ✅ (Add target for website too)

You requested: target_role includes website visitors too.

## 11.1 `announcements`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `title TEXT NOT NULL`
- `body TEXT NOT NULL`

Targeting:
- `target_audience TEXT NOT NULL DEFAULT 'all'
   CHECK (target_audience IN ('all','website','student','instructor','admin'))` ✅
- `cohort_id BIGINT REFERENCES cohorts(id) ON DELETE CASCADE` (nullable)
- `is_auto BOOLEAN NOT NULL DEFAULT FALSE` (e.g., cohort coming soon auto announcement)

Publication:
- `is_published BOOLEAN NOT NULL DEFAULT TRUE`
- `publish_at TIMESTAMPTZ`

Audit:
- `created_by BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Rules:
- When cohort status becomes `coming_soon`, server can auto-create:
  - `target_audience='website'`, `is_auto=true`

Notes:
- Website announcements page can show:
  - target_audience in ('website','all') AND is_published=true.

---

# 12) Contact Messages

## 12.1 `contact_messages`
Columns:
- `id BIGSERIAL PRIMARY KEY`
- `name TEXT NOT NULL`
- `email TEXT NOT NULL`
- `phone TEXT`
- `subject TEXT`
- `message TEXT NOT NULL`

Workflow:
- `status TEXT NOT NULL DEFAULT 'new'
   CHECK (status IN ('new','in_progress','resolved'))`
- `assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `resolved_at TIMESTAMPTZ`

---

# 13) Final Notes / Recommendations

### A) Multi-role users
Using `is_admin/is_instructor/is_student` is good and flexible for your project.
Admin dashboard should manage these flags safely.

### B) Programs vs cohorts separation
Yes: keep program as template and cohort as “real run”.
It makes scheduling, enrollment, and instructor assignment clean.

### C) Events done status
Adding `is_done` is fine. You can also auto-update it when `ends_at < NOW()`.

### D) Theme tokens
Storing theme tokens as rows is more editable and clearer than one JSON blob:
- variable name (`--primary`)
- purpose (`Primary button`)
- value (`#...`)

---

# 14) Tables Summary (Updated)

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

Programs & Cohorts:
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

Sessions & Attendance:
- `sessions`
- `attendance_records`

Comms:
- `announcements`
- `contact_messages`
