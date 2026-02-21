# SAFE Cleanup Report (apps/website)

## 1) Baseline Snapshot (Read-Only)

### Entrypoints confirmed
- `src/main.tsx`
  - Renders `<App />` under Redux + Auth providers.
  - Keeps `@/styles/index.scss` import (unchanged).
- `src/routes/AppRoutes.tsx`
  - Uses `import.meta.glob('/src/pages/*.tsx', { eager: true })` to auto-route pages.
  - Special route mappings preserved:
    - `home -> /`
    - `course-details-id -> /course-details/:id`
    - `shop-details-id -> /shop-details/:id`
    - `events-slug -> /events/:slug`
  - Keeps explicit `/test-layout` route and wildcard `*` -> not found.
- `src/styles/index.scss`
  - Vendor CSS imports preserved (`react-toastify`, `swiper`, `aos`, `react-responsive-modal`).
  - Template CSS imports preserved.
  - `../../public/assets/scss/main.scss` import chain preserved.

### Navigation-visible pages
From `src/data/home-data/MenuData.ts`, header nav links are:
- `/` (Home)
- `/courses` (Programs)
- `/events`
- `/about-us`
- `/instructors`
- `/contact`

### Routed pages present
All files in `src/pages/*.tsx` are still auto-routed (e.g. home variants, courses, events, shop, auth, dashboards, test, etc.).

### Global scripts/animations initialized
- `src/layouts/Wrapper.tsx` (unchanged behavior):
  - `AOS.init()` in `useEffect`
  - `MotionAnimation()` hook invocation (GSAP/TweenMax parallax)
  - Bootstrap JS bundle import (`bootstrap/dist/js/bootstrap.bundle.min.js`)
  - `ScrollToTop` mount
  - `ToastContainer` mount
- Swiper is used in multiple components (`swiper/react`, `swiper/modules` imports remain).

## 2) Minimal-Change Organization Plan (Executed)
- Eliminate naming confusion between `src/layout` and `src/layouts`.
- Move `MainLayout` into `src/layouts` and update imports only.
- Do not alter route system, wrapper behavior, markup, classes, or SCSS import chain.

## 3) Files Moved/Renamed
- `src/layout/MainLayout.tsx` -> `src/layouts/MainLayout.tsx`

Updated imports:
- `src/routes/AppRoutes.tsx`
  - `@/layout/MainLayout` -> `@/layouts/MainLayout`

## 4) Files Deleted (Provably Unused)

### Deleted
- `src/App.css`
- `src/index.css`
- `src/assets/react.svg`
- `src/assets/css/**`
- `src/assets/fonts/**`
- `src/assets/scss/**`
- `src/assets/video/**`
- empty folder `src/layout`

### Why these were safe
- No code/config references found for `src/App.css`, `src/index.css`, or `src/assets/react.svg`.
- No code/config references found for `src/assets/css|scss|fonts|video` paths.
- Runtime style chain points to `public/assets/**` via `src/styles/index.scss`.
- Runtime video usage points to `/assets/video/video.mp4` (public path), not `src/assets/video`.

Proof checks performed with ripgrep included patterns for:
- `App.css`, `index.css`, `react.svg`
- `@/assets/css|scss|fonts|video`
- `src/assets/css|scss|fonts|video`
- `assets/css|scss|fonts|video` references in source/config

## 5) Suspicious Items Intentionally Kept (Risk Avoidance)
- Entire `public/assets/**` tree kept untouched.
- Entire `public/assets/scss/main.scss` import chain kept untouched.
- `src/styles/index.scss` vendor + template imports kept untouched.
- `src/layouts/Wrapper.tsx` logic and initialization kept untouched.
- `src/assets/img/**` kept (heavily referenced by TS imports).
- Route generation strategy (`import.meta.glob`) kept untouched.

## 6) Verification

### Install
- `npm install` completed successfully.

### Build
- `npm run build` passed after changes.

### Dev startup
- `npm run dev` was invoked in this environment but is long-running; the command timed out in the automation session before completion output was captured.
- No build-time TypeScript/Vite regressions were introduced.

## 7) Manual Test Checklist

1. Run:
   - `cd apps/website`
   - `npm install`
   - `npm run dev`
2. Open and compare visual parity for key routes:
   - `/`
   - `/courses`
   - `/events`
   - `/about-us`
   - `/instructors`
   - `/contact`
3. Check animation behavior:
   - AOS on-scroll reveals on home/inner pages
   - Swiper carousels/sliders (home sections, testimonials, related items)
   - Motion/parallax effects (`tg-motion-effects*` elements)
4. Check global behavior:
   - Scroll-to-top button appears/works
   - Toast notifications appear where expected (cart/wishlist/checkout flows)
5. Check dashboard and detail routes:
   - student and instructor dashboard pages
   - dynamic detail routes (`/course-details/:id`, `/shop-details/:id`, `/events/:slug`)
6. Confirm browser console has no missing asset errors while navigating.
