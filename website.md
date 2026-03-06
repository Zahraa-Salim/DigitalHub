# Digital Hub — Public Website
## Pages • Features • Data from DB • API Integration (Updated)

This document defines the public website behavior based on the latest scope:

- ✅ Website is CMS-driven from database
- ✅ Visitor can apply to open cohorts
- ✅ Visitor can contact Digital Hub (questions / feedback)
- ✅ Company / Recruiter can request visits via contact form
- ✅ Website shows Programs (with Cohorts inside), Announcements, Participants, Team
- ✅ Events are presented under About section
- ✅ Website reads theme tokens and applies CSS variables
- ✅ Recruiter Assistant accessible from CTA (Hire Talent)
- ✅ Dedicated Cohort Application page exists
- ✅ Subscribe + Join Our Team CTA at bottom of Home

---

# 1) Website Goals

- Present Digital Hub as an employability / career development platform
- Show Programs and their Cohorts
- Collect cohort-based applications
- Publish Announcements (including event notices)
- Show public Participants and Team
- Collect inbound contact + recruiter visit requests

---

# 2) Global Website Requirements

## 2.1 Dynamic Theme

Website must fetch theme tokens and apply them as CSS variables.

API:
- `GET /public/theme`

---

## 2.2 Public Content Only

Any profile shown on website MUST have:

- `is_public = true`

Applies to:

- Participants (`student_profiles`)
- Instructors
- Admin Team (`admin_profiles`)

---

## 2.3 SEO-Friendly Routes

- `/`
- `/programs`
- `/programs/:slug`
- `/apply/:cohortId`
- `/participants`
- `/participants/:public_slug`
- `/team`
- `/announcements`
- `/contact`
- `/about`

Optional:
- `/projects/:id`

Events are accessible via:
- `/about#events`

---

# 3) Global Layout

## 3.1 Navbar

Left:
- Logo → `/`

Links:
- Home
- Programs
- Participants
- Contact
- About (dropdown)

About dropdown:
- Mission → `/about#mission`
- Team → `/about#team`
- Events → `/about#events`

Right:
- CTA Button: **Hire Talent**
  - `/participants?assistant=true`

---

# 4) Website Pages + Data

---

## 4.1 Home Page (`/`)

Sections (Top → Bottom)

### Hero Section
CTA:
- Explore Programs → `/programs`
- Meet Participants → `/participants`

---

### Announcements Preview (Above Programs)

API:
- `GET /public/announcements?limit=3`

Conditions:
- `target_audience IN ('website','all')`
- `is_published = true`
- `publish_at <= NOW()` if exists

CTA:
- `/announcements`

---

### Programs Preview (with Cohorts)

API:
- `GET /public/programs`
- `GET /public/cohorts?programSlug=...`

Each Program Card contains:

- Program title
- Summary
- Cohorts list (max 2–3)

Each Cohort row:

- Cohort name
- Status badge
- Dates

Apply Button visible ONLY IF:

- `status = 'open'`
- `allow_applications = true`

Apply:
- `/apply/:cohortId`

---

### Featured Participants

API:
- `GET /public/participants?featured=true`

Card links:
- `/participants/:public_slug`

---

### Featured Projects (Optional)

Data:
- `projects` where `is_public = true`

Optional cohort badge if:
- `cohort_id IS NOT NULL`

---

### Recruiter CTA

CTA:
- Hire Talent → `/participants?assistant=true`

---

### Join Our Team + Subscribe (Last Section)

Left:

- Join our team CTA
- Contact → `/contact?kind=join_team`

Right:

Email Input
Button: Stay Updated

Text:

> Get updates about programs, cohorts, events, and announcements.

(No events section on Home.)

---

## 4.2 Programs Page (`/programs`)

API:
- `GET /public/programs`

Each Program Card:

- Title
- Summary
- Cohorts inside card

Each Cohort:

- Status badge
- Enrollment info

Apply Button visible ONLY IF:

- `status = 'open'`
- `allow_applications = true`

Apply:
- `/apply/:cohortId`

---

## 4.3 Program Details (`/programs/:slug`)

API:

- `GET /public/programs/:slug`
- `GET /public/cohorts?programSlug=...`

Sections:

- Program info
- Cohorts list

Apply Button rules same as above.

---

## 4.4 Cohort Application Page (`/apply/:cohortId`)

API:

- `GET /public/forms/cohort-application?cohortId=...` (optional)
- `POST /applications`

Reject submission IF:

- cohort enrollment closed
- outside enrollment window
- duplicate application

Show confirmation on success.

---

## 4.5 Participants (`/participants`)

API:

- `GET /public/participants?page&limit&search`

Filters:

- Program
- Cohort
- open_to_work

Recruiter Assistant Panel:

Auto opens when:

- `?assistant=true`

Detail:
- `/participants/:public_slug`

---

## 4.6 Participant Detail

API:

- `GET /public/participants/:public_slug`

Show:

- Bio
- LinkedIn / Portfolio / GitHub
- open_to_work
- graduated
- working + company

Projects:

- image
- github_url
- live_url
- optional cohort badge

---

## 4.7 Team (`/team`)

API:

- `GET /public/admins`
- `GET /public/instructors`

Only show:

- `is_public = true`

Filters:

- Admins
- Instructors

---

## 4.8 About (`/about`)

API:

- `GET /public/pages/about`

Sections:

### Mission (`#mission`)
CMS content

### Team (`#team`)
Public Admins + Instructors

### Events (`#events`)
Informational section:

- workshops
- demo days
- company visits
- talks

Optional CTA:

- `/announcements`

---

## 4.9 Contact (`/contact`)

API:

- `POST /contact`

Modes:

- question
- feedback
- visit_request

Company fields:

- company_name
- company_role
- visit_preferred_dates
- visit_notes

---

# 5) Website List Standards

Use:

- page
- limit
- search
- sortBy
- order

Examples:

- `/public/programs?page=1&limit=12`
- `/public/participants?page=1&limit=12&featured=true`

---

# 6) Security / Privacy Rules

Never show:

- email
- phone
- password_hash
- admin-only internal notes

Only show:

- `is_public = true`
- `is_published = true`

---

# 7) Future Enhancements

- Newsletter signup backend
- Project gallery page
- Partner companies page
- Application status lookup
- Multi-language support (Arabic / English)


Digital Hub — Public Website
Pages • Features • Data from DB • API Integration (Updated)

This document defines the public website behavior based on the latest scope:

✅ Website is CMS-driven from database

✅ Visitor can apply to open cohorts

✅ Visitor can contact Digital Hub (questions / feedback)

✅ Company/Recruiter can request visits via contact form

✅ Website shows Programs (with Cohorts inside), Announcements, Participants, Team

✅ Events are presented under About (and via Announcements when needed)

✅ Website reads theme tokens and applies CSS variables

✅ Recruiter assistant available from CTA (Hire Talent)

✅ Projects may be displayed on participant profiles

1) Website Goals

Present Digital Hub as an employability / career development platform

Show Programs and their Cohorts

Collect Applications (cohort-based)

Publish Announcements (including event notices)

Show public Participants and Team

Collect inbound contact + recruiter visit requests

2) Global Website Requirements
2.1 Dynamic Theme

Website must fetch theme tokens and apply as CSS variables.

API:

GET /public/theme

2.2 Public Content Only

Any profile shown on website MUST have:

is_public=true

Applies to:

Participants (student_profiles)

Instructors

Admin Team (from admin_profiles)

2.3 SEO-friendly Routes (Updated)

/ Home

/programs

/programs/:slug

/apply/:cohortId ✅ NEW

/participants

/participants/:public_slug

/team

/announcements

/contact

/about

Optional:

/projects/:id

Events:

Not in primary nav

Accessible via /about#events

3) Global Layout
3.1 Navbar

Left:

Logo → /

Links:

Home

Programs

Participants

Contact

About ▾

About dropdown:

Mission → /about#mission

Team → /about#team

Events → /about#events

Right:

CTA: Hire Talent → /participants?assistant=true

4) Website Pages + Data
4.1 Home Page (/)

Sections (top → bottom):

A) Hero

CTA → /programs

CTA → /participants

B) Announcements Preview ✅ ABOVE PROGRAMS

API:

GET /public/announcements?limit=3

Conditions:

target_audience IN ('website','all')

is_published=true

publish_at <= now()

CTA:

/announcements

C) Programs Preview (with Cohorts)

API:

GET /public/programs

GET /public/cohorts?programSlug=...

Each Program Card shows:

Program title

Summary

Cohorts list (max 2–3)

Each Cohort row shows:

name

status badge

dates

Apply button visible ONLY IF:

status='open'

allow_applications=true

(optional later) within enrollment window

Apply:

/apply/:cohortId

D) Featured Participants

API:

GET /public/participants?featured=true

Cards link to:

/participants/:public_slug

E) Featured Projects (Optional)

Data:

projects where is_public=true

Optional cohort label if:

cohort_id IS NOT NULL

F) Recruiter CTA

CTA → /participants?assistant=true

G) Join Our Team + Subscribe (LAST SECTION)

Left:

“Join our team”

CTA → /contact?kind=join_team

Right:

Email input

Button: “Stay Updated”

Text:

Get updates about programs, cohorts, events, and announcements.

(No events section on Home.)

4.2 Programs (/programs)

API:

GET /public/programs

Each Program Card:

title

summary

Cohorts inside card

Each Cohort:

status

enrollment info

Apply button:
Visible only when:

status='open'

allow_applications=true

Apply:

/apply/:cohortId

4.3 Program Details (/programs/:slug)

API:

GET /public/programs/:slug

GET /public/cohorts?programSlug=...

Sections:

Program info

Cohorts list

Apply button rules same as above.

4.4 Cohort Application (/apply/:cohortId) ✅

API:

GET /public/forms/cohort-application?cohortId=... (optional)

POST /applications

Rules:
Reject if:

cohort closed

enrollment window closed

duplicate applicant

Show:

success confirmation on submit

4.5 Participants (/participants)

API:

GET /public/participants?page&limit&search

Filters:

Program

Cohort

open_to_work

Assistant panel:

opens when:

?assistant=true

Detail:

/participants/:public_slug

4.6 Participant Detail

API:

GET /public/participants/:public_slug

Show:

bio

links

open_to_work

graduated

working + company

Projects:

image

github_url

live_url

cohort badge (optional)

4.7 Team (/team)

API:

GET /public/admins

GET /public/instructors

Filters:

Admins

Instructors

Only where:

is_public=true

4.8 About (/about)

API:

GET /public/pages/about

Sections:

Mission (#mission)

Static CMS content

Team (#team)

Public Admins + Instructors

Events (#events)

Informational section:

workshops

demo days

company visits

talks

Optional CTA:

/announcements

4.9 Contact (/contact)

API:

POST /contact

Modes:

question

feedback

visit_request

Company fields:

company_name

company_role

visit_preferred_dates

visit_notes

5) Website List Standards

Use:

page

limit

search

sortBy

order

Examples:

/public/programs?page=1&limit=12

/public/participants?page=1&limit=12&featured=true

6) Security / Privacy Rules

Never show:

email

phone

password_hash

admin notes

Only:

is_public=true

is_published=true

7) Future Enhancements

Newsletter signup backend

Project gallery page

Partner companies page

Application status lookup

Arabic/English support