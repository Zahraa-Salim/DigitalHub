# Digital Hub — Project Core Layout
## System Overview • Features • Website ↔ Dashboards Relations

---

# 1) System Overview

Digital Hub consists of **3 main applications**:

digital-hub/
- web        → Public website (Visitors)
- admin      → Admin dashboard
- server     → Express API
- database   → PostgreSQL (Neon)

All frontends communicate ONLY with:

Frontend (web/admin/student/instructor)
        ↓
     Express API
        ↓
 PostgreSQL Database

Frontend MUST NEVER connect directly to database.

---

# 2) User Roles (Multi-role System)

A single user can be:

- Admin
- Instructor
- Student
- Manager (Admin shown on website)

Stored in:

users
- is_admin
- is_instructor
- is_student

One user can be:
Admin + Instructor  
Instructor + Student  
etc.

Dashboard access depends on flags.

---

# 3) Programs vs Cohorts

Programs = Template  
Example:
Full Stack Development

Contains:
- Title
- Summary
- Requirements
- Description

Programs DO NOT contain:
- Status
- Students
- Instructors
- Schedule

---

Cohorts = Real Run  
Example:
Full Stack Development — Spring 2026

Contains:
- Status
- Capacity
- Enrollment window
- Start / End dates
- Assigned instructors
- Enrolled students
- Sessions (calendar)

Students apply to:
COHORT  
NOT PROGRAM

---

# 4) Public Website Responsibilities

Website:
- Displays data
- Accepts applications
- Shows announcements
- Shows people (students/instructors/managers)
- Displays schedules

Website NEVER:
- Creates enrollments
- Assigns instructors
- Marks attendance
- Approves applications

All that belongs to dashboards.

---

## 4.1 Website Reads From Database

Theme colors → theme_tokens  
Site info → site_settings  
Home sections → home_sections  
About page → pages  
Programs → programs  
Available cohorts → cohorts  
Instructors → instructor_profiles  
Featured students → student_profiles  
Managers → manager_profiles  
Events → events  
Announcements → announcements  
Application form → forms + form_fields  

---

## 4.2 Website Writes To Database

Visitor applies → applications  
Form answers → application_submissions  
Applicant identity → applicants  
Contact form → contact_messages  

---

# 5) Admin Dashboard Responsibilities

Admin dashboard manages:

## CMS
- Edit site settings
- Edit pages
- Enable/disable home sections
- Manage theme tokens

---

## Public People

Admin controls who appears on website:

Managers → manager_profiles  
Featured Students → student_profiles  
Instructors → instructor_profiles  

Admin decides:
- visibility
- order
- public info
- featured status

---

## Programs & Cohorts

Admin can:
- Create program template
- Create cohort
- Change cohort status
- Allow / block applications
- Assign instructors

---

## Applications Pipeline

Visitor applies  
↓  
applications (pending)  
↓  
Admin reviews  
↓  
Approve  

Server then creates:

users (student)  
student_profiles  
enrollments  

---

## Sessions (Calendar)

Admin creates:

Sessions = days in the cohort schedule

Each session has:
- date
- onsite / remote / hybrid
- title
- day plan
- description
- type:
  - normal
  - visitor
  - unusual
  - exam
  - workshop

Stored in:
sessions

---

## Announcements

Admin can create announcements targeting:

- website
- student
- instructor
- admin
- all

When cohort becomes:
coming_soon

Server automatically creates:
announcement for website

---

## Events

Admin:
- creates event
- marks event done

Website shows:
- upcoming
- completed

---

# 6) Student Dashboard Responsibilities

Student can:

View enrolled cohort → enrollments  
View schedule → sessions  
View attendance → attendance_records  
View announcements → announcements  
View instructors → cohort_instructors  
Edit profile → student_profiles  

Student cannot:
- enroll themselves
- approve applications
- mark attendance

---

# 7) Instructor Dashboard Responsibilities

Instructor can:

View assigned cohorts → cohort_instructors  
View student roster → enrollments  
View sessions → sessions  
Mark attendance → attendance_records  
Create cohort announcements → announcements  

Attendance is recorded by:

session + enrollment

Instructor selects:
- present
- absent
- late
- excused

---

# 8) System Data Flow

Application Flow:

Visitor applies  
↓  
applications  
↓  
Admin approves  
↓  
users (student)  
student_profiles  
enrollments  

---

Teaching Flow:

Admin assigns instructor  
↓  
cohort_instructors  
↓  
Instructor sees cohort  
↓  
Sessions scheduled  
↓  
Instructor marks attendance  
↓  
attendance_records  

---

Website Display Flow:

Admin CMS edits  
↓  
site_settings  
home_sections  
theme_tokens  
profiles  
announcements  
↓  
Website displays  

---

# 9) Feature Responsibility Summary

Apply → Website  
Approve → Admin  
Enroll → Admin  
Schedule → Admin  
Attendance mark → Instructor  
Attendance view → Student/Instructor  
CMS edit → Admin  
Featured students → Admin  
Managers → Admin  
Announcements → All  
Events → Admin

---

# 10) Required System Guarantees

Server must ensure:
- No student enrolls without admin approval
- Cohort capacity not exceeded
- Duplicate applications prevented
- Only assigned instructors mark attendance
- Only admins change CMS or approvals
- Public endpoints never expose private user data

---

# 11) Implementation Priority

1. Authentication
2. CMS
3. Programs + Cohorts
4. Applications pipeline
5. Enrollment creation
6. Sessions calendar
7. Instructor attendance
8. Student dashboard
9. Announcements
10. Events
