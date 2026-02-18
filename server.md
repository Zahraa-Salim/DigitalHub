# Digital Hub — Server Specification (Express + TypeScript + PostgreSQL/Neon)

This document describes **exactly what the server must do** for the Digital Hub project.
It is written to be understandable for the team **and usable as a Codex prompt** later in VS Code.

It matches our **updated database model**:
- `users` has multi-role flags: `is_admin`, `is_student`, `is_instructor`
- Cohort-first workflow (students/instructors assigned to cohorts, not programs)
- Sessions are calendar items (onsite/remote/hybrid, day plan, special type)
- Attendance is linked to sessions + enrollments (Phase 2 included)
- Announcements can target `website`, `student`, `instructor`, `admin`, `all`
- Theme colors are stored as `theme_tokens` with variable name + purpose + value

Neon/Postgres notes:
- Neon typically requires SSL; node-postgres supports SSL via connection config. :contentReference[oaicite:0]{index=0}
- If you see connection errors, Neon provides specific troubleshooting guidance. :contentReference[oaicite:1]{index=1}

---

## 1) Tech Stack & Server Rules

### 1.1 Stack
- Node.js + Express
- TypeScript (ESM)
- PostgreSQL on Neon
- `pg` library (Pool)
- `dotenv` for local env
- Request validation: Zod (recommended)
- Auth: bcrypt + JWT

### 1.2 Non-negotiable rules
- No direct DB access from frontend (web/admin/student/instructor). All access goes through API.
- All DB queries must be parameterized (avoid SQL injection).
- Separate public endpoints from protected endpoints.
- Role checks must use `users.is_admin/is_student/is_instructor` flags.

### 1.3 Project layout (server)
Recommended:
server/
src/
index.ts
db/
pool.ts
config/
env.ts
middleware/
auth.ts
error.ts
validate.ts
modules/
public/
admin/
student/
instructor/
utils/
crypto.ts
pagination.ts
migrations/
.env.example
---

## 2) Environment Variables (Neon)

### 2.1 Required `.env` vars (recommended explicit pg vars)
PORT=5000
PGHOST=...
PGPORT=5432
PGDATABASE=...
PGUSER=...
PGPASSWORD=...
PGSSLMODE=require


### 2.2 DB Pool
- Create a single `Pool` instance.
- Use SSL for Neon (common approach: `ssl: { rejectUnauthorized: false }` OR rely on sslmode). See node-postgres SSL docs. :contentReference[oaicite:2]{index=2}

**Pool must be reused** across requests (do not create new pools per request).

---

## 3) Authentication & Authorization

### 3.1 Login strategy
- Users authenticate with email OR phone + password.
- Password stored as bcrypt hash.
- Server issues JWT containing:
  - `userId`
  - `is_admin`, `is_student`, `is_instructor`

### 3.2 Middleware
Implement:
- `requireAuth`: verifies JWT, attaches `req.user` (id + flags)
- `requireAdmin`: requires `req.user.is_admin`
- `requireStudent`: requires `req.user.is_student`
- `requireInstructor`: requires `req.user.is_instructor`

### 3.3 Role switching (multi-role users)
If a user has multiple flags true:
- Allow access to multiple dashboards.
- The frontend can show a “Switch Dashboard” UI; server simply enforces route permissions.

---

## 4) API Modules (What Server Must Provide)

### 4.1 Public API (main website)
Base: `/public/*`

#### 4.1.1 Bootstrap / Settings
- `GET /public/site-settings`
  - returns `site_settings` (site name, contact info, social links, default event location)
- `GET /public/theme`
  - returns `theme_tokens[]` (key, purpose, value, scope)

#### 4.1.2 Home
- `GET /public/home`
  - returns enabled `home_sections` ordered by `sort_order`

#### 4.1.3 Pages
- `GET /public/pages/:key`
  - returns page `content` if `is_published=true`

#### 4.1.4 Programs (templates)
- `GET /public/programs`
  - list program templates where `is_published=true`
- `GET /public/programs/:slug`
  - program template detail

#### 4.1.5 Cohorts (runs of programs)
- `GET /public/cohorts?programSlug=...`
  - list cohorts for a program; website should show status badges
  - include apply availability based on `status`, `allow_applications`, time window
- `GET /public/cohorts/:id`
  - cohort detail + program template info + instructors assigned to cohort

#### 4.1.6 Application Form (dynamic)
- `GET /public/forms/cohort-application?cohortId=...`
  - returns active `form_fields` for `forms.key='cohort_application'`

#### 4.1.7 Submit Application
- `POST /public/applications`
  - validates cohort is open for applications:
    - cohort.status == 'open'
    - cohort.allow_applications == true
    - (optional) now between enrollment_open_at & enrollment_close_at
    - capacity not full (server check)
  - upsert `applicants` (by email/phone)
  - create `applications` (cohort_id, applicant_id, status='pending')
  - create `application_submissions` with answers JSON
  - prevent duplicates (existing application for same applicant+cohort with pending/approved/waitlisted)

#### 4.1.8 Events
- `GET /public/events?upcoming=true`
- `GET /public/events/:slug`
  - location fallback: if event.location empty, return site_settings.default_event_location

#### 4.1.9 People pages
- `GET /public/instructors`
  - from `instructor_profiles` (public safe fields)
- `GET /public/students?featuredOnly=false&search=&page=&limit=`
  - from `student_profiles` (public safe fields)
- `GET /public/students/:public_slug` (or `:id` if you keep numeric)
- `GET /public/managers`
  - from `manager_profiles` where `is_public=true`

#### 4.1.10 Announcements (public)
- `GET /public/announcements`
  - show announcements where:
    - `target_audience IN ('website','all')`
    - `is_published=true`
    - `publish_at <= now()` if publish_at exists

#### 4.1.11 Contact
- `POST /public/contact`
  - inserts into `contact_messages` (status='new')
  - rate-limit recommended

---

### 4.2 Admin API
Base: `/admin/*` (all require `requireAdmin`)

#### 4.2.1 Site Settings + Theme
- CRUD theme tokens:
  - `GET /admin/theme-tokens`
  - `POST /admin/theme-tokens`
  - `PATCH /admin/theme-tokens/:id`
  - `DELETE /admin/theme-tokens/:id`
- Update site settings:
  - `GET /admin/site-settings`
  - `PATCH /admin/site-settings`

#### 4.2.2 Pages + Home Sections
- Pages CRUD (or edit-only):
  - `GET /admin/pages`
  - `PATCH /admin/pages/:key`
  - publish/unpublish
- Home sections:
  - `GET /admin/home-sections`
  - `PATCH /admin/home-sections/:key` (toggle, reorder, content)

#### 4.2.3 Programs (templates)
- `POST /admin/programs`
- `PATCH /admin/programs/:id`
- `DELETE /admin/programs/:id` (optional safe delete)
- publish/unpublish

#### 4.2.4 Cohorts
- `POST /admin/cohorts` (create run)
- `PATCH /admin/cohorts/:id` (status, dates, capacity, enrollment window)
- When cohort status becomes `coming_soon`:
  - auto-create announcement:
    - target_audience='website'
    - is_auto=true
    - cohort_id set

#### 4.2.5 Cohort instructors
- `POST /admin/cohorts/:id/instructors`
- `PATCH /admin/cohorts/:id/instructors/:instructorUserId` (role)
- `DELETE /admin/cohorts/:id/instructors/:instructorUserId`

#### 4.2.6 Forms management
- `GET /admin/forms`
- `POST /admin/forms`
- `PATCH /admin/forms/:id`
- `GET /admin/forms/:id/fields`
- `POST /admin/forms/:id/fields`
- `PATCH /admin/form-fields/:fieldId`
- `DELETE /admin/form-fields/:fieldId`

#### 4.2.7 Applications pipeline
- `GET /admin/applications?status=&cohortId=&page=`
- `GET /admin/applications/:id`
- `POST /admin/applications/:id/approve`
  - creates/updates:
    - `users` (student flag true)
    - `student_profiles`
    - `enrollments` (student_user_id, cohort_id)
  - updates application status approved
- `POST /admin/applications/:id/reject`
- `POST /admin/applications/:id/waitlist`

#### 4.2.8 Users & profiles management
- `GET /admin/users?roleFilter=admin|student|instructor`
  - roleFilter maps to flags
- `PATCH /admin/users/:id/roles`
  - toggle is_admin/is_student/is_instructor
- Manage profiles:
  - `PATCH /admin/students/:userId`
  - `PATCH /admin/instructors/:userId`
  - `PATCH /admin/managers/:userId` (create/update manager profile + is_public + sort)

#### 4.2.9 Sessions (calendar)
- `GET /admin/cohorts/:id/sessions`
- `POST /admin/cohorts/:id/sessions`
- `PATCH /admin/sessions/:sessionId`
- `DELETE /admin/sessions/:sessionId`

#### 4.2.10 Attendance (admin view)
- `GET /admin/sessions/:sessionId/attendance`
- `GET /admin/cohorts/:cohortId/attendance-summary`

#### 4.2.11 Announcements
- CRUD announcements:
  - audience: website/student/instructor/admin/all
  - optional cohort scope
  - publish scheduling

#### 4.2.12 Contact messages
- `GET /admin/contact-messages?status=`
- `PATCH /admin/contact-messages/:id` (status, assigned_to)

---

### 4.3 Student API
Base: `/student/*` (requireAuth + requireStudent)

- `GET /student/me`
- `PATCH /student/profile` (bio/avatar/social links, if allowed)
- `GET /student/enrollments`
- `GET /student/cohorts/:id` (only if enrolled)
- `GET /student/sessions?cohortId=`
- `GET /student/attendance?cohortId=`
- `GET /student/announcements` (audience student/all + cohort-scoped)

---

### 4.4 Instructor API
Base: `/instructor/*` (requireAuth + requireInstructor)

- `GET /instructor/me`
- `PATCH /instructor/profile` (bio/expertise/social links)
- `GET /instructor/cohorts` (assigned cohorts)
- `GET /instructor/cohorts/:id/roster` (students enrolled)
- `GET /instructor/cohorts/:id/sessions`
- Attendance:
  - `GET /instructor/sessions/:sessionId/attendance`
  - `PUT /instructor/sessions/:sessionId/attendance` (bulk upsert attendance_records)
- Announcements:
  - `POST /instructor/cohorts/:id/announcements` (target student/all)

---

## 5) Database Notes (How server uses DB)

### 5.1 Programs vs cohorts
- `programs` are templates (title, requirements, summary).
- `cohorts` are the real running instances with:
  - status, enrollment window, instructors, students, sessions, attendance.

### 5.2 Capacity logic
Capacity should be enforced at the cohort level:
- count enrollments where status in ('active','paused') <= cohort.capacity
- or include waitlist logic (applications waitlisted)

### 5.3 Public identity for students
Prefer `student_profiles.public_slug` for `/public/students/:slug` to avoid exposing numeric user ids.

### 5.4 Default event location
When returning events:
- if `events.location` is empty -> return `site_settings.default_event_location`

### 5.5 SSL connections
Neon often requires SSL. node-postgres supports passing `ssl` in config. :contentReference[oaicite:3]{index=3}
For connection problems, follow Neon troubleshooting docs. :contentReference[oaicite:4]{index=4}

---

## 6) Validation & Error Handling

### 6.1 Input validation
Use Zod schemas for:
- login payload
- site settings updates
- page/home section content updates
- program/cohort creation
- dynamic form fields
- application submissions
- session creation
- attendance bulk update

### 6.2 Error responses standard
Return consistent JSON:
- `{ error: { code, message, details? } }`

### 6.3 Logging
Log:
- startup + DB connected
- request errors
- auth failures (without leaking secrets)

---

## 7) Minimal Implementation Plan (recommended order)

1) DB pool + env config + server skeleton
2) Auth: login + middleware
3) Public: site_settings + theme + home_sections + pages
4) Programs + cohorts public list/detail
5) Dynamic form endpoints + submit application
6) Admin: cohorts CRUD + status workflow + auto announcement
7) Admin: approve pipeline -> creates student user + enrollment
8) Sessions calendar
9) Instructor: roster + attendance bulk upsert
10) Student: calendar + attendance read + announcements
11) Polishing: contact messages, managers, featured students, events done status

---
