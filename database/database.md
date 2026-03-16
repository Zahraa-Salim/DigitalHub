# Digital Hub Database Reference (Current State)

This document reflects the database state currently enforced by the codebase:

- `server/src/index.ts` (`ensureSoftDeleteColumns` + related startup SQL)
- `server/src/repositories/messageTemplates.repo.ts` (`ensureMessageTemplatesTable`)
- `database/schema.sql` (latest incremental "quick wins" ALTERs)
- `database/seed.sql` (idempotent demo data assumptions)

`database/schema.sql` is currently an incremental patch file, not a full base DDL for every table.

## Core Domains and Tables

### Identity and Profiles
- `users`
- `student_profiles`
- `instructor_profiles`
- `admin_profiles`

### Programs and Delivery
- `programs`
- `cohorts`
- `cohort_instructors`
- `enrollments`

### Admissions and Workflow
- `applicants`
- `applications`
- `program_applications`
- `application_submissions`
- `interviews`
- `application_messages`

### Forms
- `forms`
- `form_fields`

### CMS and Public Content
- `site_settings`
- `theme_tokens`
- `pages`
- `home_sections`
- `media_assets`
- `announcements`
- `events`
- `projects`

### Operations and Admin
- `attendance_sessions`
- `attendance_records`
- `contact_messages`
- `activity_logs`
- `admin_notifications`
- `message_templates`

## Current Runtime/Incremental Schema Additions

### `programs`
- `deleted_at TIMESTAMPTZ`
- `image_url TEXT`
- `featured BOOLEAN NOT NULL DEFAULT FALSE`
- `featured_rank INTEGER`
- `meta_title TEXT`
- `meta_description TEXT`
- `featured_image_url TEXT`

### `cohorts`
- `deleted_at TIMESTAMPTZ`
- `use_general_form BOOLEAN NOT NULL DEFAULT TRUE`
- `application_form_id BIGINT`
- `attendance_days JSONB NOT NULL DEFAULT '["monday","tuesday","wednesday","thursday"]'::jsonb`
- `attendance_start_time TIME`
- `attendance_end_time TIME`
- `auto_announce BOOLEAN NOT NULL DEFAULT FALSE`

### `events`
- `deleted_at TIMESTAMPTZ`
- `completion_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb`
- `post_body TEXT`
- `featured_image_url TEXT`
- `capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0)`
- `auto_announce BOOLEAN NOT NULL DEFAULT FALSE`

### `announcements`
- `deleted_at TIMESTAMPTZ`
- `event_id BIGINT`
- `cta_label TEXT`
- `cta_url TEXT`
- `cta_open_in_new_tab BOOLEAN NOT NULL DEFAULT FALSE`

### `applications`
- `submission_answers JSONB NOT NULL DEFAULT '{}'::jsonb`
- `review_message TEXT`
- `stage TEXT`
- enforced stage/status values:
  - `applied`
  - `reviewing`
  - `invited_to_interview`
  - `interview_confirmed`
  - `accepted`
  - `rejected`
  - `participation_confirmed`

### `student_profiles`
- `admin_status TEXT` (default `active`; check allows `active`/`dropout`)
- `dropout_reason TEXT`
- `status_updated_at TIMESTAMPTZ`
- `status_updated_by BIGINT`

### `instructor_profiles`
- `skills TEXT`
- `sort_order INTEGER`

### `admin_profiles`
- `skills TEXT`

### `contact_messages`
- `linkedin_url TEXT`

### `users`
- `reset_password_token TEXT`
- `reset_password_expires TIMESTAMPTZ`
- `last_login_at TIMESTAMPTZ`

### `projects`
- `deleted_at TIMESTAMPTZ`

## Runtime-Created Tables (If Missing)

### `media_assets`
- stores uploaded CMS/media metadata
- includes unique `file_name` and `public_url`
- has `tags JSONB`, audit timestamps, and optional `created_by` FK to `users`

### `attendance_sessions`
- one session per cohort/day (`UNIQUE (cohort_id, attendance_date)`)
- `location_type` check: `remote` or `on_site`

### `attendance_records`
- one record per student per session (`UNIQUE (session_id, student_user_id)`)
- `attendance_status` check: `present`, `absent`, `late`

### `message_templates`
- ensured via repository bootstrap
- `channel` check allows: `email`, `sms`, `all`

## Key Indexes Ensured

- `idx_programs_featured` on `programs (featured, featured_rank)` where featured
- `idx_instructor_profiles_sort_order` on `instructor_profiles (sort_order)`
- `idx_users_reset_password_token` on `users (reset_password_token)`
- `idx_media_assets_created_at` on `media_assets (created_at DESC)`
- `idx_media_assets_file_name` on `media_assets (file_name)`
- `idx_attendance_sessions_cohort_date` on `attendance_sessions (cohort_id, attendance_date DESC)`
- `idx_attendance_records_student` on `attendance_records (student_user_id, marked_at DESC)`
- `idx_message_templates_active_order` on `message_templates (is_active, sort_order)`

## Practical Note

The "current database" in this project is the result of base schema + startup compatibility SQL + incremental schema patches. This file reflects that combined effective state.
