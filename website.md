# Digital Hub — Main Website Workflow (Public) + Students Pages

This document describes the **public website workflow**: what pages exist, what content comes from the database, what actions happen, and key rules/notes.  
Includes **Students List**, **Students Summary**, **Student Detail**, and **Footer** requirements.

---

## 0) Global Website Rules

### 0.1 Global data loaded on every page
**DB / API sources**
- `site_settings`
  - `site_name`
  - `theme` (JSON of CSS variables)
  - `default_event_location` (default: "Digital Hub")
  - `contact_info` (address, phone, email)
  - `social_links`

**Used for**
- Header branding + footer contact/social
- Default event location fallback
- Theme styling via CSS variables

**Notes**
- Cache in frontend (e.g., 10 minutes) to reduce requests.
- Apply theme vars at app start:
  - `--primary`, `--secondary`, `--bg`, `--text`, etc.

---

## 1) Home Page (`/`) Workflow

Home is built from **sections stored in DB** and toggled on/off by admin.

### 1.1 Fetch home sections
**API**
- `GET /public/home`

**DB**
- `home_sections` where `is_enabled=true` sorted by `sort_order`

**Section block shape**
- `key` (unique)
- `title`
- `content` (JSON)
- `is_enabled`
- `sort_order`

### 1.2 Required home sections (minimum)
- `hero`
- `about_summary`
- `programs_preview`
- `events_preview`
- `featured_students` ✅
- `featured_instructors`
- `announcements_preview`
- `cta`
- `contact_summary`

---

## 2) About Page (`/about`)
**API**
- `GET /public/pages/about`

**DB**
- `pages` where `key='about'` and `is_published=true`

**Notes**
- Block-based JSON rendering (paragraphs, images, bullet lists, cards).

---

## 3) Programs List (`/programs`)
**API**
- `GET /public/programs?status=coming_soon,open,running,completed&search=&page=`

**DB**
- `programs`

**Rules**
- Apply button only if:
  - `status='open'`
  - `allow_applications=true`
  - within enrollment window (optional)

---

## 4) Program Details (`/programs/:slug`)
**API**
- `GET /public/programs/:slug`

**DB**
- `programs`
- `program_instructors` + `instructor_profiles`

### 4.1 Application form (dynamic fields)
**Only visible when**
- `status='open'` and `allow_applications=true`
- within enrollment open/close (if used)
- capacity not full (checked in API)

**Form schema**
- `forms` + `form_fields` (`key='program_application'`)

**Submit**
- `POST /public/applications`
- writes:
  - `applicants` (upsert)
  - `applications`
  - `application_submissions` (answers JSON)

**Duplicate apply rule**
- If same applicant already has pending/approved/waitlisted application for same program:
  - show “Already applied” message + current status

---

## 5) Events List (`/events`) & Event Details (`/events/:slug`)
**API**
- `GET /public/events?upcoming=true`
- `GET /public/events/:slug`

**DB**
- `events`

**Location rule**
- If `events.location` is null/empty → use `site_settings.default_event_location`

---

## 6) Instructors List (`/instructors`) & Instructor Detail (optional)
**API**
- `GET /public/instructors`
- optional: `GET /public/instructors/:id`

**DB**
- `instructor_profiles` (and `users` where `role='instructor'` and active)

---

## 7) Contact Page (`/contact`)
**Display**
- `site_settings.contact_info`
- `site_settings.social_links`

**Submit**
- `POST /public/contact`
- writes:
  - `contact_messages`

**Notes**
- Add rate-limiting to prevent spam.

---

# 8) Students Pages (Public)

You requested:
- Students list
- Students list summary
- Student detail (with id)
- Featured support
- Footer requirements

These are public-facing pages to showcase students (not the private student dashboard).

---

## 8.1 Students List Summary (Home section) ✅
### Purpose
Display a short preview of featured students on the home page.

**Section**
- `home_sections.key='featured_students'`

**Expected `content`**
- `title` (optional override)
- `subtitle`
- `limit` (e.g., 4)
- `showFeaturedOnly` (boolean, default true)
- `ctaText` (e.g., "View All Students")
- `ctaLink` (e.g., "/students")

**DB needed**
- `student_profiles`
  - `featured=true`
  - order by `featured_rank` asc, then `created_at` desc

**Fields shown per student card**
- `student_profiles.user_id` (or `public_id`, see notes)
- `full_name`
- `avatar_url`
- `bio` short
- optional: `program_name` (if you want to show current program)

**Notes**
- If no featured students exist:
  - hide section OR show fallback text from section content.

---

## 8.2 Students List Page (`/students`) ✅
### Purpose
Public directory of students (or featured students).

**API**
- `GET /public/students?featuredOnly=false&search=&page=&limit=`

**DB**
- `student_profiles`
- join `users` (role='student', is_active=true)

**Filters**
- `featuredOnly=true` → only `student_profiles.featured=true`
- search by `full_name` (ILIKE)

**Sorting**
- featured first (if mixed)
- `featured_rank` asc
- then `full_name` asc

**Fields returned**
- `id` (recommended: `student_profiles.user_id` as stable identifier)
- `full_name`
- `avatar_url`
- `bio` (short)
- `featured` (boolean)
- optional: `featured_rank`

**UI requirements**
- Search input
- Featured filter toggle (optional)
- Pagination

**Notes (privacy)**
- Do NOT expose: phone, email, address, personal data.
- Keep only public profile fields.

---

## 8.3 Student Detail Page (`/students/:id`) ✅
### Purpose
Public profile for one student.

**API**
- `GET /public/students/:id`

**DB**
- `student_profiles` by `user_id`
- join `users` to ensure role is student + active

**Fields displayed**
- `id` (user_id)
- `full_name`
- `avatar_url`
- `bio`
- `featured` (boolean)
- optional: achievements / gallery / projects (if you add later)
- optional: related programs (ONLY if you want public association)

**Error states**
- If student not found or not public → 404 page.

**Notes**
- If you want to avoid exposing raw numeric ids publicly:
  - add `public_slug` or `public_id` column to `student_profiles` and route by that instead.

---

# 9) Footer (All Pages) ✅

### 9.1 Footer content sources
**DB**
- `site_settings`
  - `site_name`
  - `contact_info` (address, phone, email)
  - `social_links`
- optional: `pages` keys (published)
  - to generate footer links automatically

### 9.2 Footer sections (recommended)
1. Brand
   - site name + short description (optional in `site_settings`)
2. Quick Links
   - Home, About, Programs, Events, Instructors, Students, Contact
3. Contact
   - address, phone, email
4. Social
   - icons + links
5. Copyright
   - `© {year} {site_name}. All rights reserved.`

**Notes**
- Footer should be consistent across web pages.
- Footer should not require multiple requests: include `site_settings` in app bootstrap.

---

# 10) Attendance Note (No Email Confirmation)
Public website does not confirm attendance.
Attendance is recorded by instructors in instructor dashboard via:
- `attendance_records(session_id, enrollment_id, status, marked_by, marked_at)`

Optional student self check-in (phase 2):
- session code entry, stored in `attendance_checkins`.

---

# 11) Data Summary — What public site reads/writes

## Reads
- `site_settings`
- `home_sections`
- `pages`
- `programs`
- `events`
- `instructor_profiles`
- `student_profiles` ✅
- `forms` + `form_fields`
- `announcements` (optional public)

## Writes
- `contact_messages`
- `applications` + `applicants` + `application_submissions`

---

# 12) Implementation Notes / Rules
- Programs:
  - `coming_soon` → details visible, apply hidden
  - `open` → apply visible only if `allow_applications=true` and within window
- Events:
  - default location from `site_settings.default_event_location`
- Students:
  - featured supported via `student_profiles.featured=true` + `featured_rank`
  - avoid exposing private fields publicly
- Theme:
  - store CSS variables in `site_settings.theme` and apply globally at runtime
