# Digital Hub — Server Implementation Guide
## Express API + PostgreSQL (Neon)

This document defines **exactly what the server must implement** for the Digital Hub platform.

It is intended to:
- Guide backend implementation
- Serve as API contract for frontend
- Be used as a prompt for AI-assisted code generation (Codex)
- Ensure consistency with business requirements and database schema

---

# 1. Architecture Overview

Backend Stack:
- Node.js
- Express
- PostgreSQL (Neon)
- JWT Authentication
- Bcrypt Password Hashing

Project structure:

server/
│
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── middleware/
│   ├── validators/
│   ├── utils/
│   ├── db/
│   └── index.ts
│
└── .env

---

# 2. Core Backend Responsibilities

Server must:

- Authenticate Admin users
- Manage all CMS data
- Manage users and profiles
- Manage programs and cohorts
- Handle applications
- Approve enrollments
- Handle announcements
- Handle events
- Handle contact messages
- Generate activity logs
- Generate in-dashboard admin notifications

Server must NOT:

- Send push/email notifications automatically (dashboard only for now)

---

# 3. Authentication

JWT Admin authentication required for:

- All dashboard endpoints
- CMS editing
- User/profile management
- Applications review
- Program/Cohort management
- Announcements
- Events
- Contact message replies

Middleware required:

- verifyAdminAuth()

---

# 4. Pagination / Sorting / Filtering (GLOBAL RULE)

All list endpoints MUST support:

Query params:

| Param     | Description |
|-----------|-------------|
page        | page number |
limit       | items per page |
sortBy      | column name |
order       | asc / desc |
search      | full text search |
status      | optional filter |
is_public   | optional filter |
featured    | optional filter |
cohort_id   | optional filter |

Default:
page=1  
limit=10  
order=desc  

Return format:

{
  data: [],
  pagination: {
    page,
    limit,
    total,
    totalPages
  }
}

---

# 5. Logging + Notifications (MANDATORY)

Every admin action MUST:

1. Insert into:
   activity_logs

2. Insert into:
   admin_notifications
   for ALL admin users

Actions that MUST be logged:

- login
- create/update/delete program
- create/update cohort
- change cohort status
- approve/reject application
- create enrollment
- edit pages
- edit home sections
- edit site settings
- edit theme tokens
- create announcement
- create event
- reply to contact message
- profile visibility change

Helper function required:

logAdminAction({
 actorUserId,
 action,
 entityType,
 entityId,
 message,
 metadata
})

This function MUST:
- insert into activity_logs
- create admin_notifications rows

---

# 6. CMS Endpoints

Admin Only:

GET    /cms/site-settings  
PATCH  /cms/site-settings  

GET    /cms/pages  
PATCH  /cms/pages/:id  

GET    /cms/home-sections  
PATCH  /cms/home-sections/:id  

GET    /cms/theme  
POST   /cms/theme  
PATCH  /cms/theme/:id  

All CMS updates MUST log activity.

---

# 7. Programs + Cohorts

Programs = template only  
Cohorts = real run

Programs:

POST   /programs  
GET    /programs  
PATCH  /programs/:id  
DELETE /programs/:id  

Cohorts:

POST   /cohorts  
GET    /cohorts  
PATCH  /cohorts/:id  
DELETE /cohorts/:id  

POST   /cohorts/:id/open  
POST   /cohorts/:id/close  

GET    /cohorts/:id/instructors  
POST   /cohorts/:id/instructors  

All MUST log activity.

---

# 8. Users + Profiles

Admin manages:

- student_profiles
- instructor_profiles
- manager_profiles

Endpoints:

GET    /profiles/students  
PATCH  /profiles/students/:userId  

GET    /profiles/instructors  
PATCH  /profiles/instructors/:userId  

GET    /profiles/managers  
PATCH  /profiles/managers/:userId  

Visibility:

PATCH  /profiles/students/:userId/visibility  
PATCH  /profiles/instructors/:userId/visibility  
PATCH  /profiles/managers/:userId/visibility  

Visibility changes MUST log activity.

---

# 9. Applications

Visitor applies to cohort.

Public:

POST /applications

Admin:

GET  /applications  
PATCH /applications/:id/approve  
PATCH /applications/:id/reject  

Approve must:

- create user
- create student_profile
- create enrollment
- log activity

---

# 10. Announcements

POST   /announcements  
GET    /announcements  
PATCH  /announcements/:id  
DELETE /announcements/:id  

If target = website  
→ must appear publicly

All must log.

---

# 11. Events

POST   /events  
GET    /events  
PATCH  /events/:id  
DELETE /events/:id  

PATCH  /events/:id/mark-done  

All must log.

---

# 12. Contact Messages

Public:

POST /contact

Admin:

GET    /contact  
PATCH  /contact/:id/status  
POST   /contact/:id/reply  

Reply MUST:

- update last_replied_at
- log action

---

# 13. Admin Notifications

GET    /notifications  
PATCH  /notifications/:id/read  
PATCH  /notifications/read-all  

---

# 14. Activity Logs

GET /logs

Supports:

- actor_user_id
- action
- entity_type
- date_from
- date_to

---

# 15. Public Website Endpoints

GET /public/programs  
GET /public/cohorts  
GET /public/events  
GET /public/announcements  
GET /public/managers  
GET /public/instructors  
GET /public/students  

Public endpoints must only return:

is_public = true

---

# 16. Required Middleware

- verifyAdminAuth
- validatePagination
- validateRequest
- errorHandler

---

# 17. Transactions (MANDATORY)

Use DB transaction when:

- approving application
- creating enrollment
- assigning instructor
- editing CMS
- creating announcement/event

Rollback on failure.

---

# 18. Security

- Password hashing with bcrypt
- JWT expiration
- Role check: is_admin=true
- Input validation
- SQL injection prevention

---

# 19. Success Criteria

Server must:

- Support CMS
- Support Programs/Cohorts
- Support Applications
- Support Profiles
- Support Events
- Support Announcements
- Support Contact
- Generate logs
- Generate admin dashboard notifications
- Support pagination/filter/sort

---

# 20. Current Implementation Status (Updated)

## 20.1 What Is Done In Server

- Layered architecture is implemented:
  - `routes -> controllers -> services -> repositories -> schemas`
- Standard response helpers are in use:
  - `sendSuccess`, `sendList`, `sendError`
- Admin auth middleware is implemented and enforced on admin-only routes:
  - `verifyAdminAuth`
- Zod validation is implemented with `validateRequest` on write endpoints.
- Pagination/filter/sort/search utilities are implemented with:
  - `parseListQuery`, `parseQueryBoolean`, `buildPagination`
- Activity logging + admin notifications are implemented through:
  - `logAdminAction()`
- Transactions are implemented for key flows:
  - application approval
  - CMS edits
  - announcement/event creation
  - instructor assignment
- Seed script is implemented:
  - `src/scripts/seedAdmin.ts`
- Duplicate application protection is implemented with normalized email/phone + DB unique indexes.

## 20.2 What You Still Need To Do In Server

- Add missing public website endpoints required by `website.md`:
  - `GET /public/theme`
  - `GET /public/home` or `GET /public/home-sections`
  - `GET /public/pages/:key`
  - `GET /public/programs/:slug`
  - `GET /public/students/:public_slug`
- Add optional form bootstrap endpoint if you want dynamic apply form fields:
  - `GET /public/forms/cohort-application?cohortId=...`
- Add missing public filters/rules from website contract:
  - `GET /public/cohorts?programSlug=...`
  - `GET /public/events?upcoming=true` and `GET /public/events?is_done=true`
  - announcement rule: `publish_at <= NOW()` when `publish_at` is set
- Enforce apply-window rules in public application flow:
  - reject when cohort is not open for applications
  - reject when enrollment window is closed
- Add automated API regression tests (recommended).
- Add API collection (Postman/Insomnia) for faster frontend QA (recommended).

## 20.3 Implemented Routes (Current)

Health:
- `GET /`
- `GET /health`

Auth:
- `POST /auth/login`

CMS (Admin):
- `GET /cms/site-settings`
- `PATCH /cms/site-settings`
- `GET /cms/pages`
- `PATCH /cms/pages/:id`
- `GET /cms/home-sections`
- `PATCH /cms/home-sections/:id`
- `GET /cms/theme`
- `POST /cms/theme`
- `PATCH /cms/theme/:id`

Programs + Cohorts (Admin):
- `POST /programs`
- `GET /programs`
- `PATCH /programs/:id`
- `DELETE /programs/:id`
- `POST /cohorts`
- `GET /cohorts`
- `PATCH /cohorts/:id`
- `DELETE /cohorts/:id`
- `POST /cohorts/:id/open`
- `POST /cohorts/:id/close`
- `GET /cohorts/:id/instructors`
- `POST /cohorts/:id/instructors`

Profiles (Admin):
- `GET /profiles/students`
- `PATCH /profiles/students/:userId`
- `PATCH /profiles/students/:userId/visibility`
- `GET /profiles/instructors`
- `PATCH /profiles/instructors/:userId`
- `PATCH /profiles/instructors/:userId/visibility`
- `GET /profiles/managers`
- `PATCH /profiles/managers/:userId`
- `PATCH /profiles/managers/:userId/visibility`

Applications:
- `POST /applications` (Public)
- `GET /applications` (Admin)
- `PATCH /applications/:id/approve` (Admin)
- `PATCH /applications/:id/reject` (Admin)

Announcements (Admin):
- `POST /announcements`
- `GET /announcements`
- `PATCH /announcements/:id`
- `DELETE /announcements/:id`

Events (Admin):
- `POST /events`
- `GET /events`
- `PATCH /events/:id`
- `DELETE /events/:id`
- `PATCH /events/:id/mark-done`

Contact:
- `POST /contact` (Public)
- `GET /contact` (Admin)
- `PATCH /contact/:id/status` (Admin)
- `POST /contact/:id/reply` (Admin)

Notifications (Admin):
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

Logs (Admin):
- `GET /logs`

Public:
- `GET /public/programs`
- `GET /public/cohorts`
- `GET /public/events`
- `GET /public/announcements`
- `GET /public/managers`
- `GET /public/instructors`
- `GET /public/students`

---

# 21. Redis, Rate Limit, and Cache Status (Render + Local)

## 21.1 What Was Implemented

- Optional Redis client utility with graceful fallback:
  - `src/utils/redis.ts`
  - Uses `REDIS_URL` when available.
  - If Redis is missing/unavailable, server still starts and requests continue.
- Redis-backed rate limiting middleware:
  - `src/middleware/rateLimit.ts`
  - Falls back to noop if Redis is down.
- Cache helpers:
  - `src/utils/cache.ts`
  - Safe no-op behavior when Redis is unavailable.
- Public endpoint caching at service layer:
  - `GET /public/theme` cached as `public:theme` for `600s`
  - `GET /public/home` cached as `public:home` for `60s`
- Cache invalidation after admin CMS writes:
  - Theme create/update invalidates `public:theme`
  - Home section update invalidates `public:home`

## 21.2 Rate-Limited Endpoints

- `POST /applications`
  - max 5 requests / 10 minutes per IP
- `POST /contact`
  - max 5 requests / 10 minutes per IP
- `POST /auth/login`
  - max 10 requests / 10 minutes per IP

When limit is exceeded:
- HTTP `429`
- code: `RATE_LIMITED`
- message: `Too many requests. Please try again later.`

## 21.3 New Public Endpoints Added

- `GET /public/theme`
- `GET /public/home`

Both use the standard success response:
- `{ success: true, data: ... }`

## 21.4 Render + Local Environment Notes

- Production on Render:
  - Set `REDIS_URL` from Render Key Value.
- Local development:
  - `REDIS_URL` may be omitted.
  - Rate limiting and cache degrade gracefully (no crash, no blocking).
- `.env.example` now includes:
  - `REDIS_URL=redis://localhost:6379`

## 21.5 Why This Is Useful

- Protects public and auth endpoints from abuse/spam/bruteforce.
- Reduces DB load and response time for high-read public endpoints.
- Keeps frontend performance stable with fast repeated responses.
- Preserves uptime and DX by allowing local/server operation without Redis.
