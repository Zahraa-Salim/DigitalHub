# Digital Hub Fix Report

Generated on: March 15, 2026  
Repository root: `c:\xampp\htdocs\digital-hub`

## Summary

All 14 requested fixes were applied, and both projects compile successfully:

- `server/`: `npm run build` succeeded
- `frontend/`: `npm run build` succeeded

## Completed fixes

### Backend

1. Added the new `interview_completed` application stage/status, inserted it into the pipeline order, and updated interview completion flows to use it instead of reusing `interview_confirmed`.
2. Added forward-only stage enforcement to `patchProgramApplicationStageService`, with `rejected` still allowed from any active stage.
3. Fixed credential-message draft logging so `template_key` now matches the actual template used.
4. Fixed forgot-password behavior so reset emails and debug tokens are only produced for real active users.
5. Replaced the Redis `INCR` + `EXPIRE` race with an atomic Lua script in the rate limiter.
6. Removed `@ts-nocheck` from `server/src/repositories/profiles.repo.ts`, added typed table/sort allowlists, and added runtime guards against invalid table/sort values.
7. Switched WhatsApp Meta API versioning to `META_WA_API_VERSION` with a safe default of `v19.0`.
8. Enforced `LEARNER_SIGNIN_URL` in production and kept non-production behavior as a warning + placeholder fallback.
9. Removed `@ts-nocheck` from `server/src/index.ts`, added explicit typing for the CORS/origin helpers, and fixed the surfaced type issues.
10. Wired `allow_applications` into the public cohort service filter path so public cohort listing can now filter server-side.
11. Removed the raw interview confirm token from the default SMS body.

### Frontend

1. Made the Supabase client nullable and added a warning when env vars are missing.
2. Moved the shared API fallback URL logic into `frontend/src/lib/resolveApiUrl.ts` and reused it from all three call sites.
3. Updated `listOpenCohorts` to request only open/applyable cohorts from the backend instead of fetching 200 rows and filtering in the browser.
4. Removed the dead Redux/template store setup and deleted the unused cart/product/wishlist/course slice files plus the requested mock/hook files.
5. Removed the unused Redux `Provider` wrapper from `frontend/src/main.tsx`.

## Already existed but wrong

These needed extra correction beyond the exact requested line items:

- `interview_completed` already existed as a legacy alias in parts of the backend, but startup SQL still remapped it back to `interview_confirmed`. That was corrected so the new stage stays distinct.
- The rejection service guard was updated as requested, but the repository SQL still blocked rejection from `interview_completed`. That repository check was also fixed.
- The frontend build had unrelated pre-existing CMS editor typing issues (`EditTarget`, `localContent`, DOM mouse event typing). Minimal compile-safe fixes were added so the frontend build passes after the requested changes.

## Files touched for follow-through consistency

In addition to the explicitly requested files, a few adjacent files were updated so the fixes actually work end to end:

- `server/src/schemas/applications.schemas.ts`
- `server/src/schemas/programApplications.schemas.ts`
- `server/src/repositories/applications.repo.ts`
- `server/src/repositories/overview.repo.ts`
- `server/src/index.ts`
- `frontend/src/main.tsx`
- `frontend/src/dashboard/components/cms-editor/EditorContext.tsx`
- `frontend/src/dashboard/hooks/useCmsEditor.ts`
- `frontend/src/dashboard/components/cms-editor/EditableSpan.tsx`

## Validation

Build verification completed after the edits:

```bash
cd server && npm run build
cd ../frontend && npm run build
```

Frontend build note:

- Vite still reports a chunk-size warning for the main bundle, but the build completes successfully.

---

# Digital Hub Subscriber System Report

Generated on: March 15, 2026  
Repository root: `c:\xampp\htdocs\digital-hub`

## Summary

The full 5-step subscriber system was implemented across database, backend, frontend public pages, and the admin dashboard.

- `server/`: `npm run build` succeeded
- `frontend/`: `npm run build` succeeded

## What was implemented

### 1. Database and startup compatibility

- Added `subscribers` and `subscriber_messages` to `database/schema.sql`.
- Added startup compatibility creation via `ensureSubscribersTable(...)` in `server/src/index.ts`.
- Wired the subscribers routes into server startup.

### 2. Backend subscriber module

- Added repository, service, controller, and route layers for:
  - `POST /subscribe`
  - `POST /unsubscribe`
  - `GET /admin/subscribers`
  - `PATCH /admin/subscribers/:id`
- Reused existing project patterns:
  - `AppError`
  - `logAdminAction`
  - `parseListQuery`
  - `buildPagination`
  - `buildSearchClause`
  - `normalizePhone`
- Implemented upsert, opt-out, admin listing, and admin patch/update behavior.

### 3. Announcement broadcast subscriber matching

- Reworked `broadcastAnnouncementService` so it now actually sends, instead of only logging queue intent.
- Added automatic subscriber topic derivation from announcement data:
  - event-linked announcements -> `upcoming_events`
  - cohort-linked open announcements -> `open_programs`
  - cohort-linked non-open announcements -> `upcoming_programs`
  - general announcements -> `announcements`
- Added subscriber deduplication through `subscriber_messages`.
- Added `GET /announcements/:id/broadcast/preview`.
- Extended `announcementBroadcastSchema` with `include_subscribers`.

### 4. Public subscribe flow

- Added `submitPublicSubscribe` and `submitPublicUnsubscribe` to `frontend/src/lib/publicApi.ts`.
- Added shared public subscriber preference metadata.
- Created `frontend/src/components/inner-pages/subscribe/SubscribeModal.tsx`.
- Replaced the public newsletter email capture with phone-based subscription flow in:
  - `frontend/src/components/homes/home-one/Newsletter.tsx`
  - `frontend/src/components/homes/home-two/Newsletter.tsx`

### 5. Dashboard subscriber management

- Added dashboard API helpers in `frontend/src/dashboard/utils/api.ts` for:
  - listing subscribers
  - patching subscribers
  - loading broadcast preview
- Added `frontend/src/dashboard/pages/admin/SubscribersPage.tsx`.
- Added Subscribers to dashboard navigation and routes.
- Updated `BroadcastModal` to:
  - accept `announcementId`
  - load broadcast preview automatically
  - support `include_subscribers`
  - auto-switch email-only broadcasts to `both` when subscribers are included
- Updated `AnnouncementsPage` to pass the new modal props and send the new payload field.

## Existing code inspected and corrected where needed

- The dashboard API helper path in this repo is `frontend/src/dashboard/utils/api.ts`, not `frontend/src/dashboard/lib/api.ts`; the new subscriber API calls were added to the real shared helper file already used by the dashboard.
- `QuickPreviewPanel` was extended to accept child content so the subscriber edit panel could stay consistent with existing dashboard patterns instead of introducing a separate ad hoc drawer.
- `Table` was extended with optional row-click support so opening the subscriber edit panel works from the list view without breaking existing table callers.

## Files added

- `server/src/repositories/subscribers.repo.ts`
- `server/src/services/subscribers.service.ts`
- `server/src/controllers/subscribers.controller.ts`
- `server/src/routes/subscribers.routes.ts`
- `frontend/src/components/inner-pages/subscribe/SubscribeModal.tsx`
- `frontend/src/dashboard/pages/admin/SubscribersPage.tsx`

## Validation

```bash
cd server && npm run build
cd ../frontend && npm run build
```

Build result:

- Both builds pass.
- Frontend still shows the existing Vite chunk-size warning, but this does not block the build.

---

# Digital Hub Zustand + TanStack Query Migration Report

Generated on: March 15, 2026  
Repository root: `c:\xampp\htdocs\digital-hub`

## Summary

Steps 1 through 3 of the frontend migration were completed successfully.

- Installed `zustand`
- Installed `@tanstack/react-query`
- `frontend/`: `npm run build` succeeded

## Completed work

### 1. Query client wiring

- Added `QueryClient` and `QueryClientProvider` to `frontend/src/main.tsx`
- Kept the original import set intact aside from replacing the old provider wiring
- Configured default query options:
  - `staleTime: 30_000`
  - `retry: 1`
  - `refetchOnWindowFocus: false`

### 2. Zustand auth migration

- Exported `normalizeUser` from `frontend/src/dashboard/utils/auth.ts`
- Added `frontend/src/dashboard/stores/useAuthStore.ts`
- Migrated the listed auth consumers from direct localStorage utilities to Zustand state:
  - `frontend/src/dashboard/utils/api.ts`
  - `frontend/src/dashboard/pages/LoginPage.tsx`
  - `frontend/src/dashboard/app/RequireAdmin.tsx`
  - `frontend/src/dashboard/app/RequireRole.tsx`
  - `frontend/src/dashboard/app/RequireSuperAdmin.tsx`
  - `frontend/src/dashboard/app/AdminLayout.tsx`
  - `frontend/src/dashboard/components/overview/OverviewTab.tsx`
- Preserved the old `auth.ts` utility file for remaining callers outside this pass
- Added first-load migration from legacy localStorage keys:
  - `dh_admin_token`
  - `dh_admin_user`
  - new persisted Zustand key: `dh-auth`

### 3. TanStack Query CMS hook migration

- Replaced the manual `useEffect` + `useState` implementation in `frontend/src/hooks/useCmsPage.ts`
- Reimplemented `useCmsPage` with `useQuery`
- Preserved the exported signatures and nullable return shape of:
  - `useCmsPage`
  - `useCmsBreadcrumb`
- Removed the old `"use client"` directive from the hook file
- Set `staleTime: 60_000` to align with the server-side Redis page cache window

## Caller verification

Ran a search across frontend callers of `useCmsPage(...)` and `useCmsBreadcrumb(...)`.

Result:

- No caller changes were required
- Existing callers continue to treat `useCmsPage(...)` as a nullable page object and then read `page?.content` or pass it into CMS helper functions

## Notes

- The dashboard auth migration in this pass was intentionally scoped only to the files listed in the prompt. Other remaining callers of the old auth helpers were left untouched for a future pass.
- `npm install` completed successfully. npm reported existing peer-dependency warnings from `react-responsive-modal` against React 19, but this did not block the install or the build.

## Validation

```bash
cd frontend && npm install zustand @tanstack/react-query
cd frontend && npm run build
```

Build result:

- Frontend build passes
- Vite still reports the existing chunk-size warning, but it does not block the build
