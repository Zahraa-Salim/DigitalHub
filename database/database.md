# Digital Hub Database Reference (PostgreSQL / Neon)

This file documents the current DB state implemented by:
- `database/schema.sql` (canonical DDL)
- `database/seed.sql` (idempotent demo data)

## Core Model

- Single `users` table with role flags: `is_admin`, `is_instructor`, `is_student`
- Audience-specific profiles:
  - `student_profiles`
  - `instructor_profiles`
  - `admin_profiles` (`admin_role` = `admin` | `super_admin`)
- Programs are templates; cohorts are concrete runs
- Two admissions pipelines:
  - Cohort pipeline: `applications`
  - Program/general-apply pipeline: `program_applications`
- Shared interview/message layer:
  - `interviews` supports both pipelines (`application_id`, `program_application_id`)
  - `application_messages` supports both pipelines and stores channel metadata

## Main Domains

### Identity + Profiles
- `users`
- `student_profiles`
- `instructor_profiles`
- `admin_profiles`

### CMS + Website
- `site_settings`
- `theme_tokens`
- `pages`
- `home_sections`
- `announcements`
- `events`

### Programs + Cohorts
- `programs`
- `cohorts`
- `cohort_instructors`

### Forms
- `forms`
- `form_fields`
- Seeded form keys:
  - `cohort_application`
  - `general_apply` (preferred by public apply endpoint)
  - `program_application` (admin-managed general-apply form)
  - `contact`

### Admissions
- `applicants`
- `applications`
  - status/stage enum:
    - `applied`
    - `reviewing`
    - `invited_to_interview`
    - `interview_confirmed`
    - `accepted`
    - `rejected`
    - `participation_confirmed`
- `program_applications`
  - same stage enum as above
- `application_submissions`
- `interviews`
  - token-based confirm/reschedule via `confirm_token`
- `application_messages`
  - channel constrained to `email`/`sms`
  - `metadata JSONB` used for provider-level details (e.g. WhatsApp as `channel='sms'` + `metadata.provider='whatsapp'`)

### Messaging Templates
- `message_templates`
  - seeded defaults include:
    - `general_update`
    - `reminder`
    - `follow_up`
    - `interview_scheduling`
    - `interview_confirmation`
    - `decision_accepted`
    - `decision_rejected`
    - `account_credentials`

### Operations / Audit
- `enrollments`
- `contact_messages`
- `activity_logs`
- `admin_notifications`

## Notes

1. `schema.sql` includes compatibility `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` blocks for older databases.
2. Legacy `applications` values are normalized, then strict stage/status checks are re-applied.
3. `seed.sql` is written to be re-runnable where practical (`ON CONFLICT`, conditional inserts/updates).

## File Mapping

- Canonical schema: `database/schema.sql`
- Seed/demo data: `database/seed.sql`
