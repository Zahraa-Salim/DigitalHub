# Digital Hub — Admin Dashboard
## Features • Pages • Data Sources • API Integration (Updated)

This document defines the Admin Dashboard functionality for Digital Hub based on the latest scope:
- ✅ Only **Admin Dashboard** + **Public Website**
- ❌ No student dashboard
- ❌ No instructor dashboard
- ✅ Student/Instructor/Admin profiles exist and are managed in Admin Dashboard
- ✅ Public visibility toggles for profiles
- ✅ In-dashboard notifications + permanent activity logs
- ✅ Announcements appear on website
- ✅ No sessions/attendance

---

# 1) Purpose

The Admin Dashboard is the single control center to:
- Manage public website content (CMS)
- Manage programs and cohorts
- Manage applications and approvals (create enrollments)
- Manage events and announcements
- Manage contact inbox (including company/recruiter visit requests)
- Manage profiles and public visibility (students/instructors/admin managers)
- Track every action through logs + in-dashboard notifications

---

# 2) Roles / Access

Only authenticated admin users (`users.is_admin=true`) can access Admin Dashboard.

Server requirements:
- All admin routes require JWT + `is_admin=true`
- No dashboard feature is accessible without auth

---

# 3) Global UI Requirements

## 3.1 Layout
- Sidebar navigation
- Top bar:
  - Notifications bell (unread count badge)
  - Admin user menu
- Main content area

## 3.2 Notifications UX
- In-dashboard only (no email/SMS/push for now)
- Notifications list page/panel:
  - unread first, then read
  - mark one as read
  - mark all as read
- Toast behavior (frontend):
  - poll unread notifications and show toast for new ones
  - backend only stores notifications

## 3.3 Logging UX
- Dedicated “Logs” section
- Filter and search logs
- View log details (message + metadata JSON)

---

# 4) Global List Behavior (REQUIRED)

All list screens must support:
- Pagination: `page`, `limit` (default 10)
- Sorting: `sortBy`, `order` (asc/desc) — only allowed fields
- Filters: varies per section (status/is_public/featured/etc.)
- Search: `search` for name/title/email etc. (where relevant)

The API returns:
- `data`
- `pagination { page, limit, total, totalPages }`

---

# 5) Dashboard Pages + Features

## 5.1 Overview (Home)
Shows quick stats:
- Pending applications
- Open cohorts
- Upcoming events (optional)
- New contact messages
- Unread notifications

API (examples):
- `GET /applications?status=pending&limit=1`
- `GET /cohorts?status=open&limit=1`
- `GET /contact?status=new&limit=1`
- `GET /notifications?is_read=false&limit=5`

---

## 5.2 CMS (One Section)
CMS must be one grouped module with these pages:

### 5.2.1 Site Settings
Edits:
- site name
- default event location
- contact info JSON
- social links JSON

API:
- `GET /cms/site-settings`
- `PATCH /cms/site-settings`

Logging:
- Any PATCH creates an activity log + notifications

---

### 5.2.2 Pages
Manage pages like About/Contact/etc.
- list pages
- edit title/content JSON
- publish/unpublish

API:
- `GET /cms/pages`
- `PATCH /cms/pages/:id`

---

### 5.2.3 Home Sections
- enable/disable sections
- reorder sections
- edit content JSON

API:
- `GET /cms/home-sections`
- `PATCH /cms/home-sections/:id`

---

### 5.2.4 Theme Tokens (Colors)
Manage CSS variables stored in DB:
- variable name (key): `--bg`, `--text`, `--primary`
- purpose: Background/Text/Buttons
- value: hex/rgb
- scope: global/web/admin

API:
- `GET /cms/theme`
- `POST /cms/theme`
- `PATCH /cms/theme/:id`

---

## 5.3 Programs
Programs are templates (title/summary/requirements). No students or operational status.

Actions:
- create program
- edit program
- publish/unpublish
- delete program (optional safe delete)

List supports:
- search by title
- sort by updated_at, title
- filter by is_published

API:
- `POST /programs`
- `GET /programs?page&limit&sortBy&order&search`
- `PATCH /programs/:id`
- `DELETE /programs/:id`

Logs:
- create/update/delete must log

---

## 5.4 Cohorts
Cohorts are real runs of programs and accept applications.

Actions:
- create cohort under a program
- update status: planned/coming_soon/open/running/completed/cancelled
- open/close enrollment (allow applications)
- set capacity and enrollment dates
- assign instructors

List supports:
- filter by status
- filter by program_id
- search by cohort name
- sort by updated_at, start_date

API:
- `POST /cohorts`
- `GET /cohorts?...`
- `PATCH /cohorts/:id`
- `DELETE /cohorts/:id`
- `POST /cohorts/:id/open`
- `POST /cohorts/:id/close`

Instructor assignment:
- `GET /cohorts/:id/instructors`
- `POST /cohorts/:id/instructors`

Logs:
- status change and open/close must log
- instructor assignment must log

---

## 5.5 Applications
Visitors apply to cohorts. Admin reviews and approves.

List supports:
- filter by status (pending/approved/rejected/waitlisted)
- filter by cohort_id
- search by applicant name/email/phone
- sort by submitted_at

Actions:
- view application details
- approve
- reject
- waitlist (optional if implemented)

Approve flow MUST:
- create or find student user
- create/update student profile
- create enrollment
- update application status to approved
- log + notifications (transaction)

API:
- `GET /applications?...`
- `PATCH /applications/:id/approve`
- `PATCH /applications/:id/reject`

---

## 5.6 Profiles (Students / Instructors / Managers)

### 5.6.1 Student Profiles
Student profile exists once user exists (created on approval or created by admin).

Actions:
- edit profile fields (name, bio, avatar, links)
- toggle is_public
- set featured / featured_rank
- search and filter by public/featured

API:
- `GET /profiles/students?...`
- `PATCH /profiles/students/:userId`
- `PATCH /profiles/students/:userId/visibility`

Logs:
- edits and visibility change must log

---

### 5.6.2 Instructor Profiles
Actions:
- edit instructor profile (bio, expertise, links)
- toggle is_public

API:
- `GET /profiles/instructors?...`
- `PATCH /profiles/instructors/:userId`
- `PATCH /profiles/instructors/:userId/visibility`

Logs required.

---

### 5.6.3 Manager Profiles (Admins shown on website)
A manager is an admin profile that may appear publicly.

Actions:
- create/update manager profile
- toggle is_public
- reorder via sort_order

API:
- `GET /profiles/managers?...`
- `PATCH /profiles/managers/:userId`
- `PATCH /profiles/managers/:userId/visibility`

Logs required.

---

## 5.7 Announcements
Admin creates announcements that appear on website.

Actions:
- create announcement
- edit announcement
- publish/unpublish
- schedule publish_at (optional)

List supports:
- filter by target_audience (website/all/admin)
- sort by created_at or publish_at
- search by title/body

API:
- `POST /announcements`
- `GET /announcements?...`
- `PATCH /announcements/:id`
- `DELETE /announcements/:id`

Logs required.

---

## 5.8 Events
Admin manages events displayed on website.

Actions:
- create event
- edit event
- publish/unpublish
- mark done

List supports:
- filter is_published
- filter is_done
- sort starts_at
- search by title

API:
- `POST /events`
- `GET /events?...`
- `PATCH /events/:id`
- `DELETE /events/:id`
- `PATCH /events/:id/mark-done`

Logs required.

---

## 5.9 Contact Inbox (Questions + Visit Requests)
Public website submits contact messages including company/recruiter requests.

Actions:
- view inbox
- filter by kind: question/visit_request/feedback
- filter by status: new/in_progress/resolved
- assign to admin
- update status
- reply (stores last_replied_at + log)

API:
- `GET /contact?...`
- `PATCH /contact/:id/status`
- `POST /contact/:id/reply`

Logs required.

---

## 5.10 Notifications
Purpose:
- show admin notifications created by server side logging

Actions:
- list notifications
- mark one read
- mark all read

API:
- `GET /notifications?is_read=false&page&limit`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

---

## 5.11 Logs
Purpose:
- audit trail of all admin actions

List supports:
- filter by actor_user_id
- filter by action
- filter by entity_type
- date range (date_from/date_to)
- sort by created_at desc (default)

API:
- `GET /logs?...`

---

# 6) “Toast” behavior (Frontend rule)
Backend does NOT show toast. Backend only stores notifications.

Frontend recommended approach:
- poll every 10–20 seconds:
  - `GET /notifications?is_read=false&limit=5&sortBy=created_at&order=desc`
- compare returned IDs with the last seen set
- show toast for new IDs
- optionally mark read when user clicks notification

---

# 7) Non-negotiable constraints
- Do not expose password_hash
- Only return public profiles from public endpoints
- Always log admin actions and create notifications
- All lists must be paginated with consistent response
- Whitelist sortBy fields to prevent SQL injection

---


# Digital Hub — Admin Dashboard Pages Documentation

This document describes all pages included in the Admin Dashboard, their purpose, what they display, and the actions available for administrators.

---

## 1. Dashboard (Overview)
**Route:** `/admin`

### Purpose
Provides a high-level summary of the platform’s current state and key operational indicators.

### Displays
- Pending Applications count
- Open Cohorts count
- New Contact Messages
- Unread Notifications
- Quick summary cards for recent activities

### Actions
- Navigate to Applications
- Navigate to Cohorts
- Navigate to Contact Inbox
- Navigate to Notifications

---

## 2. Applications
**Route:** `/admin/applications`

### Purpose
Allows administrators to review and manage applications submitted by visitors for program cohorts.

### Displays
- Applicant Name
- Email
- Applied Cohort
- Application Status
- Submission Date

### Filters
- Status (Pending / Approved / Rejected / Waitlisted)
- Cohort
- Search by name/email

### Actions
- View Application Details
- Approve Application
- Reject Application
- Waitlist Application (optional)

---

## 3. Cohorts
**Route:** `/admin/cohorts`

### Purpose
Manage active and planned cohort runs for programs.

### Displays
- Cohort Name
- Program
- Status
- Capacity
- Enrollment Window
- Start / End Dates

### Filters
- Status
- Program
- Search by cohort name

### Actions
- Create Cohort
- Edit Cohort
- Delete Cohort
- Open Enrollment
- Close Enrollment
- Assign Instructor(s)

---

## 4. Programs
**Route:** `/admin/programs`

### Purpose
Manage program templates that appear publicly on the website.

### Displays
- Program Title
- Summary
- Requirements
- Publish Status
- Last Updated

### Filters
- Published / Unpublished
- Search by title

### Actions
- Create Program
- Edit Program
- Publish / Unpublish
- Delete Program

---

## 5. CMS

### 5.1 Site Settings
**Route:** `/admin/cms/site-settings`

#### Purpose
Configure global website settings.

#### Displays
- Site Name
- Default Event Location
- Contact Info
- Social Media Links

#### Actions
- Update Site Settings

---

### 5.2 Pages
**Route:** `/admin/cms/pages`

#### Purpose
Manage website content pages (e.g., About page).

#### Displays
- Page Title
- Page Key
- Publish Status

#### Actions
- Edit Page
- Publish / Unpublish Page

---

### 5.3 Home Sections
**Route:** `/admin/cms/home-sections`

#### Purpose
Control homepage section visibility and order.

#### Displays
- Section Title
- Enabled Status
- Sort Order
- Section Content

#### Actions
- Enable / Disable Section
- Edit Section Content
- Reorder Sections

---

### 5.4 Theme Tokens
**Route:** `/admin/cms/theme`

#### Purpose
Manage global styling variables used in the website (CSS variables).

#### Displays
- Token Key
- Purpose
- Value
- Scope

#### Actions
- Create Token
- Update Token

---

## 6. Announcements
**Route:** `/admin/announcements`

### Purpose
Create and manage announcements for the website.

### Displays
- Title
- Body
- Target Audience
- Publish Date
- Publish Status

### Filters
- Target Audience
- Publish Status

### Actions
- Create Announcement
- Edit Announcement
- Publish / Unpublish
- Delete Announcement

---

## 7. Events
**Route:** `/admin/events`

### Purpose
Manage events displayed on the public website.

### Displays
- Event Title
- Description
- Location
- Start Date
- Publish Status
- Done Status

### Filters
- Published
- Completed

### Actions
- Create Event
- Edit Event
- Publish / Unpublish
- Mark Event as Done
- Delete Event

---

## 8. Profiles

### 8.1 Students
**Route:** `/admin/profiles/students`

#### Purpose
Manage student profiles shown publicly.

#### Displays
- Full Name
- Bio
- Public Status
- Featured Status

#### Actions
- Edit Profile
- Toggle Public Visibility
- Set Featured Rank

---

### 8.2 Instructors
**Route:** `/admin/profiles/instructors`

#### Purpose
Manage instructor profiles.

#### Displays
- Full Name
- Expertise
- Public Status

#### Actions
- Edit Profile
- Toggle Public Visibility

---

### 8.3 Managers
**Route:** `/admin/profiles/managers`

#### Purpose
Manage admin profiles displayed publicly as team members.

#### Displays
- Full Name
- Job Title
- Public Status
- Sort Order

#### Actions
- Edit Profile
- Toggle Public Visibility
- Reorder Display

---

## 9. Contact Inbox
**Route:** `/admin/contact`

### Purpose
Manage inbound contact messages and visit requests.

### Displays
- Sender Name
- Email
- Subject
- Message
- Message Type
- Status
- Submission Date

### Filters
- Type (Question / Feedback / Visit Request)
- Status

### Actions
- Assign Message
- Update Status
- Reply to Message

---

## 10. Notifications
**Route:** `/admin/notifications`

### Purpose
Display notifications generated from admin actions.

### Displays
- Notification Title
- Preview Body
- Read / Unread Status
- Timestamp

### Actions
- Mark as Read
- Mark All as Read

---

## 11. Activity Logs
**Route:** `/admin/logs`

### Purpose
Audit trail of all important admin actions.

### Displays
- Actor
- Action Type
- Entity Type
- Message
- Timestamp

### Filters
- Actor
- Action
- Entity Type
- Date Range

### Actions
- View Log Details

---

## 12. My Profile
**Route:** `/admin/profile`

### Purpose
View current admin account details.

### Displays
- Email
- Role(s)
- Last Login

### Actions
- Logout
