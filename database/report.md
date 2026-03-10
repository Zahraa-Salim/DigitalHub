# Digital Hub Project Technical Report

Generated on: March 10, 2026  
Repository root: `c:\xampp\htdocs\digital-hub`

## 1) Executive Summary

Digital Hub is a full-stack platform that combines:

- A public website for program discovery, applications, events, announcements, participant profiles, and contact.
- A role-based admin dashboard for admissions operations, forms, CMS, attendance, messaging, profiles, and audit visibility.
- A backend API that serves both admin and public workflows, backed by PostgreSQL and optional Redis.

The system is built as a monorepo with three main directories:

- `frontend/` (React + Vite + TypeScript)
- `server/` (Node + Express + TypeScript)
- `database/` (SQL seed and schema reference files)

Core business purpose:

- Manage learner acquisition and admissions end-to-end.
- Operate programs/cohorts and related communication workflows.
- Publish and maintain public-facing content from admin tools.
- Provide operational visibility with overview metrics and logs.

## 2) Product Goals and Purpose

Primary goals:

- Convert public interest into structured applications.
- Move applicants through a controlled admissions pipeline.
- Coordinate interviews, decisions, and enrollment/onboarding.
- Keep public website content editable without code deployments.
- Centralize communication (email + WhatsApp) in dashboard workflows.
- Preserve auditable admin actions and notification trails.

Operational goals:

- Reduce manual back-and-forth with tokenized interview confirmation/reschedule links.
- Support both cohort-specific applications and general program applications.
- Make bottlenecks visible in a command-center dashboard.
- Keep the system resilient when optional services (Redis/SMTP/WhatsApp provider) are unavailable.

## 3) High-Level Architecture

### 3.1 Monorepo Structure

- `server/src/index.ts`: Express bootstrap, middleware, route mounting, startup checks, schema compatibility migrations.
- `server/src/routes/*.routes.ts`: endpoint registration by domain.
- `server/src/controllers/*.controller.ts`: HTTP layer.
- `server/src/services/*.service.ts`: business workflows and orchestration.
- `server/src/repositories/*.repo.ts`: SQL access.
- `server/src/utils/*.ts`: shared infrastructure helpers (mailer, redis, cache, whatsapp, pagination, SQL helper, etc.).
- `frontend/src/routes/AppRoutes.tsx`: public + dashboard route composition.
- `frontend/src/dashboard/*`: admin application.
- `frontend/src/lib/publicApi.ts`: public website API client.
- `frontend/src/dashboard/utils/api.ts`: dashboard API client and auth-aware request wrapper.
- `database/seed.sql`: demo data seed script.
- `database/schema.sql`: incremental SQL changes (not a full formal migration history).

### 3.2 Runtime Topology

Main runtime components:

- Browser client (public site + admin dashboard).
- Express API server (`server`).
- PostgreSQL database.
- Optional Redis instance.
- External providers:
  - SMTP server (email delivery).
  - WhatsApp providers:
    - Meta Cloud API (`graph.facebook.com/v19.0`)
    - Twilio WhatsApp API (still supported by utility layer).

## 4) Technology Stack

### 4.1 Backend

- Node.js + TypeScript (ESM, `module: NodeNext`)
- Express `5.2.x`
- PostgreSQL (`pg`)
- Validation: `zod`
- Auth/security: `jsonwebtoken`, `bcryptjs`
- Email: `nodemailer`
- WhatsApp: `axios` (Meta service file), native `fetch` utility wrapper
- Caching/rate-limit backend: `ioredis`
- Env handling: `dotenv`

### 4.2 Frontend

- React `19.x`
- Vite `7.x`
- TypeScript
- Routing: `react-router-dom`
- State: Redux Toolkit (legacy/template features) + local state/hooks in dashboard
- Forms: `react-hook-form` in some areas and custom controlled form logic
- Notifications: `react-toastify` + custom toast components in dashboard
- Styling: Sass + dashboard-specific CSS modules/files
- UI libs present: Bootstrap, Framer Motion, Swiper, Lucide, etc.

### 4.3 Data/Infra

- PostgreSQL as source of truth
- Redis for:
  - Request rate limiting counters
  - Public content caching
- Local filesystem storage for uploads under `server/uploads/*`

## 5) Backend Architecture and Patterns

### 5.1 Layered Pattern

Typical request flow:

1. Route validates request shape and middleware auth.
2. Controller delegates to service.
3. Service enforces business rules and workflow branching.
4. Repository executes SQL statements.
5. Utility functions handle shared concerns (mail, WhatsApp, cache, logging, responses).

### 5.2 Response Standard

Unified envelopes from `server/src/utils/httpResponse.ts`:

- Success: `{ success: true, data, message? }`
- List: `{ success: true, data, pagination }`
- Error: `{ success: false, error: { code, message, details? } }`

### 5.3 Validation and Errors

- Route-level validation with Zod in `validateRequest`.
- Global error normalization in `errorHandler`:
  - Zod validation errors
  - AppError domain errors
  - Known PostgreSQL codes (e.g., unique/foreign key/check violations)
  - Database/network transient failures mapped to `503 DB_UNAVAILABLE`.

### 5.4 Auth and Authorization

Authentication:

- Admin JWT (`/auth/login`) with `userId` + `isAdmin` claims.
- Token verified in `verifyAdminAuth`.

Authorization:

- `verifyAdminAuth` for admin routes.
- `verifySuperAdminAuth` for super-admin-only operations.
- Role model:
  - `admin`
  - `super_admin`

### 5.5 Startup Compatibility Migrations

At server startup (`server/src/index.ts`):

- Connectivity check (`SELECT 1`).
- `ensureSoftDeleteColumns()` applies many `ALTER TABLE IF NOT EXISTS` + compatibility backfills.
- `ensureStudentProfileUserLinks()` backfills missing user links for student profiles.

Important architectural note:

- This project currently relies on app-start SQL compatibility logic instead of a dedicated migration framework.

## 6) Major Backend Domains and Features

### 6.1 Auth and Admin Accounts

Files:

- `server/src/routes/auth.routes.ts`
- `server/src/services/auth.service.ts`
- `server/src/routes/admins.routes.ts`
- `server/src/services/admins.service.ts`

Features:

- Admin login.
- Forgot/reset password flow with secure hashed reset token.
- Self profile update (`/auth/me`), including optional password change.
- Super-admin admin-management APIs.
- Broadcast messaging to selected users (email/WhatsApp).

### 6.2 Applications (Cohort Pipeline)

Files:

- `server/src/routes/applications.routes.ts`
- `server/src/services/applications.service.ts`

Pipeline stages:

- `applied`
- `reviewing`
- `invited_to_interview`
- `interview_confirmed`
- `accepted`
- `rejected`
- `participation_confirmed`

Also contains legacy alias handling for older values (`submitted`, `reviewed`, etc.).

Workflow coverage:

- Public application submit (`POST /applications`).
- Admin listing/filtering.
- Stage patching.
- Shortlisting.
- Interview scheduling/completion.
- Decision setting.
- Participation confirmation.
- User creation from application.
- Message drafts and sends.
- Public token endpoints for interview confirm/reschedule and participation confirm.

### 6.3 Program Applications (General Apply Pipeline)

Files:

- `server/src/routes/programApplications.routes.ts`
- `server/src/services/programApplications.service.ts`

Features:

- Parallel pipeline for general program applicants.
- Stage transitions and interview operations.
- Messaging and retry.
- Decision and participation confirmation.
- User creation.
- Bridging to cohort `applications` records through linked-application logic when needed.

### 6.4 Programs, Cohorts, and Instructors

Files:

- `server/src/routes/programs.routes.ts`
- `server/src/services/programs.service.ts`

Features:

- CRUD for program templates.
- CRUD for cohorts.
- Cohort open/close operations.
- Cohort instructor assignment.
- Cohort status derivation logic from dates.
- Optional auto-announcement synchronization.
- Program image upload (base64 -> `uploads/programs/*`).

### 6.5 Forms Engine

Files:

- `server/src/routes/forms.routes.ts`
- `server/src/services/forms.service.ts`

Features:

- Dynamic forms and form fields (create/edit/reorder/enable/disable).
- General cohort form and program-application form management.
- Cohort-specific form assignment (`general` vs `custom` mode).
- Default field sets for baseline operation.

### 6.6 Public Content + CMS

Admin CMS files:

- `server/src/routes/cms.routes.ts`
- `server/src/services/cms.service.ts`

Public files:

- `server/src/routes/public.routes.ts`
- `server/src/services/public.service.ts`

Features:

- Site settings, pages, home sections, theme tokens, media assets.
- Public APIs for programs, cohorts, events, announcements, managers, instructors, students.
- Public apply form discovery and submission.
- Cohort detail endpoints exposing program summary/description/requirements.

### 6.7 Messaging Templates

Files:

- `server/src/routes/messageTemplates.routes.ts`
- `server/src/services/messageTemplates.service.ts`

Features:

- Template CRUD with channel targeting (`email`, `sms`, `all`).
- Default templates ensured using advisory lock.
- Token replacement placeholders, e.g. `{name}`, `{scheduled_at}`, `{confirm_url}`.

### 6.8 Contact Inbox

Files:

- `server/src/routes/contact.routes.ts`
- `server/src/services/contact.service.ts`

Features:

- Public contact submission (rate limited).
- Admin contact inbox list and status updates.
- Reply-by-email workflow with log entry.

### 6.9 Attendance

Files:

- `server/src/routes/attendance.routes.ts`
- `server/src/services/attendance.service.ts`

Features:

- Running cohort discovery for attendance.
- Attendance sheet retrieval and save.
- Student attendance history endpoint.

### 6.10 Profiles and Public Directory

Files:

- `server/src/routes/profiles.routes.ts`
- `server/src/services/profiles.service.ts`

Features:

- Student, instructor, manager profile management.
- Public visibility toggles.
- Instructor activation/deactivation.
- Student status admin workflows.

### 6.11 Overview, Logs, Notifications

Files:

- `server/src/routes/overview.routes.ts`
- `server/src/services/overview.service.ts`
- `server/src/repositories/overview.repo.ts`
- `server/src/routes/logs.routes.ts`
- `server/src/routes/notifications.routes.ts`

Features:

- Operational aggregates for dashboard command center.
- Messaging health and failed-message retries.
- Activity feed and capacity/config alerts.
- Notification management.

### 6.12 Projects Module

Files:

- `server/src/routes/projects.routes.ts`
- `server/src/services/projects.service.ts`

Features:

- Admin project CRUD.
- Public projects and participant project listing.

### 6.13 WhatsApp Integration

There are two integration paths:

1. Dedicated Meta endpoint:
- `server/src/routes/whatsapp.routes.ts`
- `server/src/services/whatsappService.ts`
- Endpoint: `POST /api/whatsapp/send`
- Provider: Meta Cloud API `v19.0`

2. Cross-workflow messaging utility:
- `server/src/utils/whatsapp.ts`
- Provider switch via `WHATSAPP_PROVIDER`:
  - `twilio` (kept active)
  - `meta`

Storage note:

- In pipeline message records, WhatsApp is represented as `channel='sms'` and metadata may store `{ provider: "whatsapp" }`.

## 7) Redis and Caching (Requested Focus)

Redis integration files:

- `server/src/utils/redis.ts`
- `server/src/utils/cache.ts`
- `server/src/middleware/rateLimit.ts`
- `server/src/services/public.service.ts`
- `server/src/services/cms.service.ts`

### 7.1 Redis Behaviors

- Lazy connection (`lazyConnect: true`).
- Fail-open behavior:
  - If Redis is missing/unavailable, app continues.
  - Rate limiter and cache become effectively disabled.

### 7.2 Redis Use Cases

1. Rate limiting counters:
- Login, forgot/reset password, public applications, and contact submission.
- Key patterns like:
  - `rl:auth:login:<identity>`
  - `rl:public:applications:<identity>`

2. Public content cache:
- `public:theme` (TTL 600s)
- `public:theme:last_known_good` (TTL 86400s)
- `public:home` (TTL 60s)
- `public:home:last_known_good` (TTL 86400s)
- `public:page:<slug>` (TTL 60s)

3. Cache invalidation:
- CMS updates clear corresponding public cache keys.

## 8) Data Model Summary

Core entities from code and `database/database.md`:

- Identity:
  - `users`
  - `admin_profiles`
  - `instructor_profiles`
  - `student_profiles`
- Programs and delivery:
  - `programs`
  - `cohorts`
  - `cohort_instructors`
- Admissions:
  - `applicants`
  - `applications`
  - `program_applications`
  - `application_submissions`
  - `interviews`
  - `application_messages`
  - `enrollments`
- Forms:
  - `forms`
  - `form_fields`
- CMS/public:
  - `site_settings`
  - `theme_tokens`
  - `pages`
  - `home_sections`
  - `media_assets`
  - `announcements`
  - `events`
- Operations:
  - `attendance_sessions`
  - `attendance_records`
  - `activity_logs`
  - `admin_notifications`
  - `contact_messages`
  - `projects`

Critical relationship pattern:

- Two admissions pipelines converge through shared `interviews` and `application_messages`.
- Program applications can be linked to cohort applications when progressing toward enrollment.

## 9) Frontend Architecture

### 9.1 Route Structure

Public route generation:

- `frontend/src/routes/AppRoutes.tsx` auto-maps files in `frontend/src/pages/*.tsx`.

Dashboard route tree:

- `frontend/src/routes/DashboardRoutes.tsx`
- `frontend/src/dashboard/app/adminRoutes.tsx`
- Mounted under `/admin/*`.

### 9.2 API Client Layers

Public site API client:

- `frontend/src/lib/publicApi.ts`
- Handles `/public/*` endpoints and public contact/apply submissions.

Dashboard API client:

- `frontend/src/dashboard/utils/api.ts`
- Injects Bearer token.
- Handles auth failures by clearing session and redirecting.
- Exposes typed methods in `frontend/src/dashboard/lib/api.ts`.

### 9.3 Admin Feature Surface (Page-Level)

Dashboard pages include:

- Overview
- Admissions
- General Apply
- Forms
- Message Templates
- Messages
- Attendance
- Cohorts
- Programs
- Events
- Announcements
- CMS (site settings/pages/home/theme)
- Profiles (students/instructors/managers)
- Contact Inbox
- Notifications
- Activity Logs
- Admin Management
- My Profile

### 9.4 Public Website Surface

Public pages include:

- Home
- Programs
- Apply
- Events
- Participants
- Instructors/Team
- About
- Contact
- Legal pages (privacy/terms)

Public apply forms:

- Cohort mode (`ApplicationForm`) with dynamic form resolution.
- Program mode (`GeneralApplyForm`) with dynamic field rendering and program metadata display.

## 10) End-to-End Workflow Summaries

### 10.1 Admin Login

1. User submits email/password to `/auth/login`.
2. Backend validates admin identity and password hash.
3. JWT issued and `last_login_at` updated.
4. Dashboard stores token/user info in local storage.

### 10.2 Public Cohort Application

1. User opens `/apply?cohortId=...`.
2. Frontend loads open cohorts and resolved form schema.
3. User submits applicant identity + answers.
4. Backend stores applicant/application/submission and logs action.

### 10.3 Public General Apply

1. User opens `/apply` without cohort.
2. Frontend loads program-application form and published programs.
3. Submission upserts a `program_applications` record.
4. Admin reviews in General Apply dashboard page.

### 10.4 Interview Scheduling + Applicant Confirmation

1. Admin schedules interview from admissions workflow.
2. Backend creates/updates interview with confirm token.
3. Message draft/send can include confirm/reschedule links.
4. Applicant confirms via `/public/interviews/:token/confirm`.
5. Backend updates interview status and advances application/program-application stage to `interview_confirmed` when eligible.

### 10.5 Decision and Participation

1. Admin sets decision (`accepted`/`rejected`).
2. For accepted candidates, participation confirmation can be triggered.
3. Applicant confirmation token route updates stage to `participation_confirmed`.

### 10.6 User Creation From Application

1. Admin triggers create-user workflow.
2. Backend creates student user if needed, profile, enrollment links.
3. Optional onboarding messages (email/WhatsApp) are sent.
4. Stage alignment updates to `participation_confirmed` where needed.

### 10.7 Message Lifecycle

1. Draft created in `application_messages` (`draft`).
2. Send action uses channel provider.
3. Status updated to `sent` or `failed`.
4. Failed items are visible in overview/messages and can be retried.

## 11) API Surface by Route Module

The API is broad; this is the diagram-friendly grouping:

- `auth`: login, forgot/reset password, me/admin/user messaging.
- `applications`: full cohort admissions pipeline.
- `program-applications`: full general-apply pipeline.
- `programs` + `cohorts`: operations and instructor assignment.
- `forms`: dynamic forms and field management.
- `cms`: site settings/pages/home/theme/media.
- `public`: public read APIs + apply + token confirm/reschedule routes.
- `profiles`: students/instructors/managers and visibility controls.
- `attendance`: attendance sheets and history.
- `contact`: public submissions + admin inbox and replies.
- `overview`: command-center aggregates + failed-message retries.
- `message-templates`: reusable messaging content.
- `notifications` + `logs`: admin operations visibility.
- `projects`: admin CRUD + public project endpoints.
- `whatsapp`: direct dashboard WhatsApp send endpoint.

## 12) Environment Variables Matrix

Database:

- `DATABASE_URL` or (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`)
- `PGSSL`, `PGSSLMODE`, `PGSSL_REJECT_UNAUTHORIZED`
- `PG_CONNECT_TIMEOUT_MS`, `PG_IDLE_TIMEOUT_MS`, `PG_POOL_MAX`

Server:

- `PORT`
- `NODE_ENV`
- `CORS_ORIGIN`
- `JSON_BODY_LIMIT`
- `FRONTEND_DIST_DIR`

Auth:

- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `AUTH_FORGOT_ALLOW_ANY_EMAIL`
- `AUTH_DEBUG_RETURN_RESET_TOKEN`
- `PASSWORD_RESET_URL_BASE`
- `DASHBOARD_URL`
- `FRONTEND_URL`

Email:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_SERVICE`
- `SMTP_USER`, `SMTP_PASS`
- `DIGITAL_HUB_EMAIL`
- `MAIL_FROM_NAME`
- `MAIL_FROM_ADDRESS`

WhatsApp:

- `WHATSAPP_PROVIDER` (`twilio` or `meta`)
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- Meta: `META_WA_TOKEN`, `META_PHONE_NUMBER_ID`

Redis:

- `REDIS_URL`

Frontend:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Seeds/E2E:

- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
- `E2E_API_BASE_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (fallbacks in test script)

## 13) Security and Reliability Notes

Security controls currently present:

- JWT-protected admin routes.
- Super-admin gate for sensitive admin-management actions.
- Request validation with Zod.
- Password hashing with bcrypt.
- Rate limits on sensitive/public endpoints.
- Production env validation with fail-fast checks.

Reliability controls:

- DB transient error handling in multiple modules.
- Optional Redis with graceful degradation.
- Last-known-good cache strategy for public theme/home.

## 14) Observed Technical Debt and Risks

1. Migration strategy:
- Compatibility SQL is embedded in startup logic; a dedicated migration tool would improve change tracking and rollback safety.

2. TypeScript consistency:
- Many backend files include `// @ts-nocheck` despite `strict: true`, reducing static guarantees.

3. WhatsApp implementation split:
- There is both a dedicated Meta service and a utility provider switch used by pipeline workflows. Consolidation could reduce drift risk.

4. Bundle size:
- Frontend build emits a chunk-size warning (main bundle > 500 kB minified).

5. Naming clarity:
- `overview-mock` component path is still used for live overview UI, which may confuse maintenance and onboarding.

## 15) Diagram Blueprint (What to Draw)

### 15.1 Context Diagram

Actors:

- Public visitor/applicant
- Admin
- Super admin

External systems:

- SMTP provider
- WhatsApp providers (Meta/Twilio)
- Redis
- PostgreSQL

Core system:

- Digital Hub web platform (frontend + backend)

### 15.2 Container Diagram

Containers:

- React SPA (public + admin dashboards)
- Express API server
- PostgreSQL DB
- Redis cache/rate-limit store
- Uploads filesystem storage

### 15.3 Component Diagram (Backend)

Components per request:

- Route
- Validation middleware
- Auth middleware
- Controller
- Service
- Repository
- Utility services (mailer/whatsapp/cache/logging)

### 15.4 Sequence Diagrams to Produce

Recommended sequences:

1. Public cohort application submit.
2. Admin schedules interview and sends email/WhatsApp.
3. Applicant confirms interview via token link.
4. Admin accepts candidate and creates user/enrollment.
5. CMS page update -> cache invalidation -> public page fetch.

### 15.5 ER Diagram Focus

Must-include tables:

- `users`, `admin_profiles`, `instructor_profiles`, `student_profiles`
- `programs`, `cohorts`, `cohort_instructors`
- `applicants`, `applications`, `program_applications`
- `interviews`, `application_messages`, `enrollments`
- `forms`, `form_fields`
- `site_settings`, `pages`, `home_sections`, `theme_tokens`, `media_assets`
- `events`, `announcements`
- `activity_logs`, `admin_notifications`, `contact_messages`

### 15.6 State Machines to Draw

1. Application/program_application lifecycle:
- `applied -> reviewing -> invited_to_interview -> interview_confirmed -> accepted|rejected -> participation_confirmed`

2. Interview lifecycle:
- `pending_confirmation -> confirmed|reschedule_requested -> completed|cancelled`

3. Message lifecycle:
- `draft -> sent|failed` with retry path from `failed`.

## 16) Build and Validation Snapshot

Local checks run for this report:

- `server`: `npm run build` succeeded (`tsc -p tsconfig.json`).
- `frontend`: `npm run build` succeeded (`tsc -b && vite build`), with chunk-size warning from Vite.

## 17) Practical Notes for Your Presentation

If your goal is to explain the platform clearly in diagrams/slides, emphasize:

- Two admissions pipelines with shared interview and messaging infrastructure.
- Content platform + operations platform in one codebase.
- Event-driven admin logs/notifications after critical actions.
- Redis as optional accelerator (cache/rate limit), not hard dependency.
- Hybrid WhatsApp strategy (Meta endpoint + retained Twilio path for fallback compatibility).

