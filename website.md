# Digital Hub — Public Website
## Pages • Features • Data from DB • API Integration (Updated)

This document defines the public website behavior based on the latest scope:
- ✅ Website is content-driven from database (CMS)
- ✅ Visitor can apply to open cohorts
- ✅ Visitor can contact Digital Hub (questions / feedback)
- ✅ Company/Recruiter can request visits via contact form
- ✅ Website shows programs, cohorts, announcements, events, public profiles
- ✅ Website reads theme tokens and applies CSS variables

---

# 1) Website Goals
- Present Digital Hub as an employability / career development platform
- Show programs and upcoming cohorts
- Collect applications (cohort-based)
- Publish announcements and events
- Show selected people (students/instructors/managers) when public
- Collect inbound contact + visit requests

---

# 2) Global Website Requirements

## 2.1 Dynamic Theme
- Website must fetch theme tokens and apply them as CSS variables.
- Tokens include:
  - key: `--primary`
  - purpose: "Primary buttons"
  - value: "#0b0f19"

API:
- `GET /public/theme`
(or if your server exposes theme under public bootstrap, use that)

---

## 2.2 Public Content Only
Any profile shown on website MUST have:
- `is_public=true`

This applies to:
- students
- instructors
- managers

---

## 2.3 SEO-friendly Routes (recommended)
- `/programs`
- `/programs/:slug`
- `/cohorts` (optional)
- `/events`
- `/announcements`
- `/students`
- `/students/:public_slug`
- `/instructors`
- `/team` (managers)
- `/contact`
- `/about` (from pages)
- `/` home

---

# 3) Website Pages + Data

## 3.1 Home Page (`/`)
Home page sections are driven by DB.

Data:
- `home_sections` (enabled + ordered)
- may include curated blocks like featured students, announcements, events

API:
- `GET /public/home` (or `GET /public/home-sections`)
- `GET /public/announcements?limit=...`
- `GET /public/events?upcoming=true&limit=...`
- `GET /public/students?featured=true&limit=...`

---

## 3.2 Programs List (`/programs`)
Shows all published programs.

Data:
- programs where `is_published=true`

API:
- `GET /public/programs?page&limit&search&sortBy&order`

Sorting (suggested):
- title asc
- updated desc

---

## 3.3 Program Details (`/programs/:slug`)
Shows:
- program info
- cohorts under the program

Data:
- program by slug
- cohorts filtered by program

API:
- `GET /public/programs/:slug`
- `GET /public/cohorts?programSlug=...`

Cohorts show:
- status badge (coming_soon/open/running/completed)
- apply button visible only if:
  - status == open
  - allow_applications == true
  - now within enrollment window (if used)

---

## 3.4 Cohort Application (`/apply/:cohortId` or modal)
Visitor applies to a cohort.

Data:
- dynamic form fields from DB
- cohort status + rules

API:
- `GET /public/forms/cohort-application?cohortId=...` (if implemented)
- `POST /applications` (public)

Rules:
- reject submission if cohort enrollment is closed
- reject duplicates if same applicant already applied

---

## 3.5 Announcements (`/announcements`)
Shows announcements intended for website visitors.

Data:
- announcements:
  - `target_audience IN ('website','all')`
  - `is_published=true`
  - publish_at <= now() if publish_at exists

API:
- `GET /public/announcements?page&limit&search&sortBy&order`

---

## 3.6 Events (`/events`)
Shows upcoming + done events.

Data:
- events:
  - `is_published=true`
  - optional filter by is_done/upcoming

API:
- `GET /public/events?upcoming=true&page&limit`
- `GET /public/events?is_done=true&page&limit`

Event location:
- if event.location is null:
  - use `site_settings.default_event_location`

---

## 3.7 Students (`/students`)
Shows public students.

Data:
- `student_profiles` where `is_public=true`
- optional featured section:
  - featured=true ordered by featured_rank

API:
- `GET /public/students?page&limit&search&featured=true&sortBy&order`

Student detail:
- `GET /public/students/:public_slug`

---

## 3.8 Instructors (`/instructors`)
Shows public instructors.

Data:
- `instructor_profiles` where `is_public=true`

API:
- `GET /public/instructors?page&limit&search`

---

## 3.9 Team / Managers (`/team`)
Shows public managers (admins who chose to appear on website).

Data:
- `manager_profiles` where `is_public=true` ordered by sort_order

API:
- `GET /public/managers`

---

## 3.10 Pages (About, etc.) (`/about`, `/page/:key`)
Pages are DB-driven.

Data:
- `pages` where is_published=true

API:
- `GET /public/pages/:key`

---

## 3.11 Contact (`/contact`)
Contact form supports:
- Questions
- Feedback
- Company/Recruiter visit request

Data written:
- `contact_messages` with kind:
  - question | feedback | visit_request

API:
- `POST /contact` (public)

Fields:
- name (required)
- email (required)
- phone (optional)
- subject (optional)
- message (required)
- kind (required)
- company fields optional:
  - company_name
  - company_role
  - visit_preferred_dates
  - visit_notes

---

# 4) Website List Standards (Pagination/Sort/Filter)

For list pages, website should use:
- page, limit
- search
- sortBy + order

Examples:
- `/public/programs?page=1&limit=12&search=ui&sortBy=title&order=asc`
- `/public/students?page=1&limit=12&featured=true&sortBy=featured_rank&order=asc`

---

# 5) Security / Privacy Rules (Website)
- Never show:
  - user email/phone
  - password hash
  - admin-only internal notes
- Only show profiles with is_public=true
- Only show published pages, events, announcements

---

# 6) Future Enhancements (Website)
- Newsletter signup
- Public media gallery
- Partner/company showcase page
- Application status lookup (if you choose later)
- Multi-language (Arabic/English)

---
