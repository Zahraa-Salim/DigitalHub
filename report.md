# Digital Hub Website Report

Date: March 2, 2026  
Scope: `apps/website` + public API integration + dashboard-driven content flow

## Done
- Public pages are wired to backend for core website data:
  - `/public/home`, `/public/programs`, `/public/cohorts`, `/public/students`, `/public/instructors`, `/public/managers`.
- Team and participants rules are implemented in UI:
  - Team = public admins + public instructors.
  - Participants = public students.
- Program/cohort CTA logic is implemented:
  - Open cohort -> `Enroll Now` -> `/apply?cohortId=<id>`.
  - Non-open cohort -> no apply CTA (uses details/coming-soon behavior).
- Apply flow is integrated with cohort/general form resolution:
  - Cohort custom form loads when assigned.
  - Falls back to general apply form when needed.
- General Apply improvements are live:
  - Fallback mode if `/public/apply/form` is missing.
  - Program details drawer appears after program selection.
  - Drawer shows related cohorts and statuses.
- Events feature is wired to backend data:
  - `/events` now reads `/public/events` (no hardcoded events).
  - Upcoming/non-completed events use branded placeholder visuals.
  - Completed events display uploaded gallery images (`completion_image_urls`).
- Dashboard + server support for event completion gallery was added:
  - DB column for `completion_image_urls`.
  - Event image upload endpoint.
  - Dashboard event form supports multi-image upload for completed events.
- Console warning cleanup in progress:
  - React Router v7 future flags enabled.
  - Swiper loop behavior guarded for insufficient slide counts.

## Pending
- Ensure backend process running on `localhost:5000` is the latest build exposing `/public/apply/form`.
- Finalize events detail route (`/events/:slug`) if needed:
  - Currently cards route to contact fallback.
- Route naming parity with product docs:
  - Current live path is `/courses` (if final spec requires `/programs`, align routes).
- Optional frontend optimization:
  - Split large chunks (Vite warning about >500kB bundle).
- Optional UX enhancement:
  - Unified top-right “Content updated” notices for critical data changes only.

## Deployment Checklist
1. Backend
   - `cd server`
   - `npm run build`
   - `npm run dev`
   - Verify:
     - `GET /health` returns success
     - `GET /public/apply/form` returns configured form data
     - `GET /public/events` returns event rows with `completion_image_urls`
2. Dashboard
   - `cd apps/dashboard`
   - `npm run build` (or run dev mode)
   - Verify event flow:
     - Create/edit event
     - Mark done
     - Upload completion gallery images
3. Website
   - `cd apps/website`
   - `npm run build` (or run dev mode)
   - Verify pages:
     - `/`, `/courses`, `/team`, `/participants`, `/apply`, `/events`, `/contact`
4. Functional checks
   - Cohort card CTA behavior (open vs non-open) is correct.
   - Apply from navbar works (general apply).
   - Apply from open cohort works (cohort apply).
   - Selected program drawer appears with cohort statuses.
   - Events page:
     - Upcoming cards show branded placeholder (not photos).
     - Completed cards show uploaded gallery imagery.
5. Console checks
   - No blocking API/CORS errors.
   - Any remaining extension/runtime notices are non-app (browser extension noise).
