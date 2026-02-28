# Digital Hub Website Project Report

## 1. Project Goal (From `website.md`)
The target website is a database-driven public platform for Digital Hub that:
- Presents programs and cohorts.
- Collects cohort applications.
- Shows public participants and team members.
- Publishes announcements and event-related content.
- Accepts contact, feedback, and recruiter/company visit requests.
- Uses dynamic theme tokens from DB.
- Supports SEO-friendly public routes.

## 2. Current Project Snapshot
The current frontend is a React + Vite + TypeScript project with reusable section-based architecture.  
Routing is generated from files in `apps/website/src/pages`, and the app currently relies mostly on local mock data.

Current main public pages:
- `/` (home)
- `/courses` (used as programs page)
- `/about-us`
- `/participants`
- `/team`
- `/contact`

## 3. What Is Done Exactly
### 3.1 UI and Structure
- Programs page UI is implemented with card layout, sidebar filters, top sorting, and pagination.
- Participants and Team pages are separated and use a shared, styled, animated directory component with filters.
- Breadcrumb SVG line-draw animation is restored and stabilized (movement reduced to subtle drift).
- Footer and contact info support runtime fetch with fallback defaults.

### 3.2 Data Layer Progress
- Mock data has been moved to clearer folders and renamed for clarity.
- A DB-aligned template and mapping layer has been added:
  - `apps/website/src/data/mock/dbAlignedMockTemplates.ts`
- Programs mock source now maps DB-shaped templates to current course card shape:
  - `apps/website/src/data/mock/programCourseMocks.ts`
- People/team mock source now maps DB-shaped templates to current people card shape:
  - `apps/website/src/data/mock/peopleDirectoryData.ts`

### 3.3 Codebase Organization
- Hooks were normalized to React naming (`use*`).
- Related section files were consolidated (`people.sections.tsx`).
- Top comments were added across source files to explain purpose and change impact.
- Build passes after the cleanup and data-mapping changes.

## 4. Gap Analysis Against `website.md`
### 4.1 Global Requirements
1. Dynamic theme tokens (`GET /public/theme`): **Not implemented** in frontend.
2. Public-only profile enforcement (`is_public=true`): **Partially implemented** conceptually, but frontend still uses mock templates, not live API responses.
3. SEO route set: **Partially implemented**. Required routes like `/programs`, `/programs/:slug`, `/apply/:cohortId`, `/announcements`, `/about` are not fully present (current uses `/courses`, `/about-us`).

### 4.2 Navbar and CTA
1. Required About dropdown anchors (`/about#mission`, `#team`, `#events`): **Not implemented**.
2. Hire Talent CTA (`/participants?assistant=true`): **Not implemented** (header CTA is currently Contact).

### 4.3 Page-Level Scope
1. Home:
- Announcements preview above programs: **Not implemented**.
- Programs preview with cohorts and conditional apply buttons: **Not implemented**.
- Recruiter CTA + Join Team + Subscribe final section per spec: **Partially implemented visually, not wired to required behavior/backends**.
2. Programs (`/programs`) + Program Details (`/programs/:slug`):
- Card list exists but at `/courses`.
- DB/API cohort structure per card is not yet wired.
- Program details route/page is **missing**.
3. Cohort Application (`/apply/:cohortId`): **Missing**.
4. Participants list/detail:
- List page exists with filters and style.
- Public detail page (`/participants/:public_slug`) is **missing**.
- Recruiter assistant panel (`?assistant=true`) is **missing**.
5. Team:
- Team page exists.
- API split by admins/instructors and filter mode per spec is **not yet wired**.
6. About:
- Page exists but does not follow required `Mission/Team/Events` anchored structure from CMS.
- Events section in About is **missing**.
7. Contact:
- Page exists.
- Required mode-based submit (`question`, `feedback`, `visit_request`) to backend is **not implemented**.

### 4.4 API Contract Alignment
There is a naming mismatch between target spec and current backend public routes:
- Spec uses: `/public/participants`, `/public/admins`, `/public/pages/about`.
- Current backend exposes: `/public/students`, `/public/managers`, and does not expose `/public/pages/about` in `public.routes`.

This should be resolved either by:
1. Backend aliases to match website spec.
2. Frontend adapters mapping spec names to existing backend endpoints.

## 5. Recommended Plan To Reach Goal
### Phase 1: Route and Navigation Alignment
1. Rename/alias routes to required public URLs:
- `/programs` (instead of `/courses`)
- `/about` (instead of `/about-us`)
- Add `/programs/:slug`, `/apply/:cohortId`, `/announcements`, `/participants/:public_slug`
2. Update navbar to include About dropdown anchors and Hire Talent CTA.

### Phase 2: Public API Integration (Replace Mock Reads)
1. Build `publicApi` client module for:
- `/public/theme`
- `/public/programs`
- `/public/cohorts`
- `/public/announcements`
- `/public/students` (or `/public/participants` alias)
- `/public/instructors`
- `/public/managers` (or `/public/admins` alias)
2. Keep existing card styles and reuse current mapper approach from `dbAlignedMockTemplates.ts`.

### Phase 3: Programs and Cohort Actions
1. Programs page: render programs with nested cohorts.
2. Show Apply button only when:
- `status='open'`
- `allow_applications=true`
- inside enrollment window (if provided).
3. Implement Program Details page and Cohort Application page.

### Phase 4: Participants and Team Completion
1. Add participant detail page with links and projects.
2. Add assistant panel behavior for `?assistant=true`.
3. Team page filters for Admins vs Instructors from API.

### Phase 5: About, Announcements, Contact Completion
1. About page:
- CMS mission content
- Team block
- Events block (`#events`)
2. Announcements page with list/pagination/sorting.
3. Contact form:
- send to backend endpoint
- support `kind` and company visit fields.

### Phase 6: Dynamic Theme + Security Rules
1. Fetch and apply theme tokens as CSS variables at app bootstrap.
2. Ensure frontend never displays restricted fields (`email`, `phone`, `password_hash`, internal notes).
3. Keep only `is_public` and `is_published` content visible.

## 6. Immediate Next Work Items (High Priority)
1. Implement route aliases and navbar changes.
2. Create `publicApi` service and replace programs/participants/team mock reads first.
3. Add `/apply/:cohortId` with submission workflow.
4. Add `/participants/:public_slug` with project cards.
5. Integrate theme tokens globally.

## 7. Conclusion
The project now has a stronger frontend foundation, cleaner structure, stable animations, and DB-aligned mock mapping.  
To fully meet the target scope in `website.md`, the critical remaining work is full public API integration, route/spec alignment, and completion of missing pages/workflows (program details, cohort application, participant detail, announcements, dynamic theme, and contact modes).
