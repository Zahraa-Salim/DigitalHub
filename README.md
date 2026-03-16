# Digital Hub

A full-stack platform for managing learner acquisition, admissions, program delivery, and public-facing content. The system combines a public website, a role-based admin dashboard, and a backend API backed by PostgreSQL.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Project](#running-the-project)
- [Building for Production](#building-for-production)
- [Seeding an Admin User](#seeding-an-admin-user)
- [API Overview](#api-overview)
- [Key Workflows](#key-workflows)
- [Configuration Notes](#configuration-notes)

---

## Overview

Digital Hub serves three audiences from a single codebase:

- **Public visitors** — browse programs, view events and announcements, apply to cohorts, and subscribe for updates.
- **Admins** — manage the full admissions pipeline, communicate with applicants, edit site content, track attendance, and broadcast announcements.
- **Recruiters** — discover and shortlist graduates through the Hire Talent page.

Core capabilities:

- Two parallel admissions pipelines: cohort applications and general program applications, with shared interview and messaging infrastructure.
- A CMS and visual editor for all public-facing content, including theme tokens, home sections, and page copy — editable without code deployments.
- WhatsApp and email messaging throughout the pipeline, with template rendering, delivery tracking, and failed-message retry.
- A subscriber system for visitors who opt in via the website, with automatic preference-based targeting when broadcasting announcements.
- Redis-backed request rate limiting and public content caching with graceful degradation when Redis is unavailable.

---

## Architecture

The monorepo contains three top-level directories:

```
digital-hub/
  frontend/     React + Vite SPA (public website + admin dashboard)
  server/       Node.js + Express API
  database/     SQL schema and seed files
```

The Express server serves the compiled frontend as static files in production, so only one process and one port are needed. In development, the frontend Vite dev server and the Express API run separately.

**Request flow:**

```
Browser
  --> Express API (port 5000)
        --> Validation middleware (Zod)
        --> Auth middleware (JWT)
        --> Controller
        --> Service (business logic)
        --> Repository (SQL via pg)
        --> PostgreSQL

Optionally:
  --> Redis (rate limiting, public content cache)
  --> SMTP server (email)
  --> Meta WhatsApp Cloud API or Twilio (WhatsApp)
```

---

## Tech Stack

**Backend**

| Concern | Library |
|---|---|
| Runtime | Node.js (ESM, TypeScript) |
| Framework | Express 5 |
| Database | PostgreSQL via `pg` |
| Validation | Zod |
| Auth | `jsonwebtoken`, `bcryptjs` |
| Email | `nodemailer` |
| WhatsApp | Meta Cloud API v19 / Twilio (via `axios` and `fetch`) |
| Cache / Rate limit | `ioredis` |
| Environment | `dotenv` |

**Frontend**

| Concern | Library |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | `react-router-dom` |
| Server state | TanStack Query |
| Client state | Zustand |
| Forms | `react-hook-form`, custom controlled forms |
| Notifications | `react-toastify` |
| Styling | Sass + CSS modules |
| Animation | Framer Motion, AOS |

---

## Project Structure

```
frontend/src/
  components/         Shared and page-specific UI components
  dashboard/          Admin dashboard (pages, components, stores, utils)
    app/              Route guards, layout, router
    components/       Dashboard UI components
    pages/admin/      One file per dashboard page
    stores/           Zustand stores (auth, UI)
    utils/            API client, auth helpers, formatting
  hooks/              Shared React hooks (useCmsPage, etc.)
  lib/                Public API client, CMS helpers, image resolver
  pages/              Public website pages
  routes/             Route definitions (public + dashboard)

server/src/
  controllers/        HTTP layer — delegates to services
  db/                 Database pool and transaction helpers
  middleware/         Auth, validation, rate limiting, error handling
  repositories/       SQL queries, one file per domain
  routes/             Express route registration
  schemas/            Zod request schemas
  scripts/            One-off scripts (seed admin)
  services/           Business logic and workflow orchestration
  tests/              End-to-end API tests
  utils/              Shared helpers (mailer, WhatsApp, cache, logging)

database/
  schema.sql          Incremental schema changes
  seed.sql            Demo data
```

---

## Prerequisites

Before installing, ensure the following are available on your machine:

- **Node.js** 20 or later
- **npm** 9 or later
- **PostgreSQL** 14 or later, running locally or accessible via a connection string
- **Redis** (optional) — required for rate limiting and public content caching; the application runs without it but those features are disabled
- A **SMTP server** for outbound email (local tools like Mailpit or Mailtrap work for development)
- A **Meta WhatsApp Business** account or **Twilio** account if WhatsApp messaging is needed (optional in development)

---

## Installation

Clone the repository and install dependencies for both the server and frontend independently.

```bash
git clone <repository-url>
cd digital-hub
```

Install server dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

---

## Environment Variables

Both the server and frontend require environment files. Templates are provided below.

### Server — `server/.env`

Copy and fill in the values for your environment:

```env
# ── Server ────────────────────────────────────────────────────────────────────
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JSON_BODY_LIMIT=10mb

# ── Database ──────────────────────────────────────────────────────────────────
# Use either DATABASE_URL or the individual PGHOST/PGPORT/... variables.

DATABASE_URL=postgresql://user:password@localhost:5432/digital_hub

# Or individually:
# PGHOST=localhost
# PGPORT=5432
# PGDATABASE=digital_hub
# PGUSER=postgres
# PGPASSWORD=your_password

# SSL (set to true in production with a managed database)
PGSSL=false

# ── Auth ──────────────────────────────────────────────────────────────────────
# JWT_SECRET must be at least 48 characters in production.
JWT_SECRET=change_this_to_a_long_random_secret_string_at_least_48_chars
JWT_EXPIRES_IN=8h

# Development-only auth flags (must be false in production)
AUTH_FORGOT_ALLOW_ANY_EMAIL=true
AUTH_DEBUG_RETURN_RESET_TOKEN=true

# URLs used in reset/confirmation links sent to users
PASSWORD_RESET_URL_BASE=http://localhost:5173
FRONTEND_URL=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
PUBLIC_API_BASE_URL=http://localhost:5000

# URL for the learner sign-in page (included in credential emails)
LEARNER_SIGNIN_URL=http://localhost:5173/login

# ── Email (SMTP) ──────────────────────────────────────────────────────────────
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

DIGITAL_HUB_EMAIL=noreply@digitalhub.local
MAIL_FROM_NAME=Digital Hub
MAIL_FROM_ADDRESS=noreply@digitalhub.local

# Email address to receive admin notifications (reschedule requests, etc.)
ADMIN_NOTIFY_EMAIL=admin@digitalhub.local

# ── WhatsApp ──────────────────────────────────────────────────────────────────
# Set WHATSAPP_PROVIDER to 'meta' or 'twilio'.
WHATSAPP_PROVIDER=meta

# Meta Cloud API
META_WA_TOKEN=
META_PHONE_NUMBER_ID=
META_WA_API_VERSION=v19.0

# Twilio (if using WHATSAPP_PROVIDER=twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=+14155238886

# ── Redis ─────────────────────────────────────────────────────────────────────
# Optional. If not set, rate limiting and caching are silently disabled.
REDIS_URL=redis://localhost:6379

# ── Initial admin seed ────────────────────────────────────────────────────────
SEED_ADMIN_EMAIL=admin@digitalhub.com
SEED_ADMIN_PASSWORD=changeme123

# ── End-to-end tests ──────────────────────────────────────────────────────────
E2E_API_BASE_URL=http://localhost:5000/api
E2E_ADMIN_EMAIL=admin@digitalhub.com
E2E_ADMIN_PASSWORD=changeme123
```

### Frontend — `frontend/.env`

```env
# URL of the running Express API.
VITE_API_URL=http://localhost:5000/api

# Supabase (optional — only needed if Supabase features are used)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Database Setup

### 1. Create the database

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE digital_hub;
```

### 2. Run the schema

Apply the schema to the newly created database:

```bash
psql -U postgres -d digital_hub -f database/schema.sql
```

If `schema.sql` only contains incremental changes rather than a full `CREATE TABLE` bootstrap, the server will apply any missing tables and columns automatically on first start via startup compatibility checks. The `subscribers` and `subscriber_messages` tables are always created on startup if they do not already exist.

### 3. Load demo data (optional)

```bash
psql -U postgres -d digital_hub -f database/seed.sql
```

---

## Running the Project

### Development

Start the API server with live reload:

```bash
cd server
npm run dev
```

The server starts on `http://localhost:5000`.

In a separate terminal, start the frontend dev server:

```bash
cd frontend
npm run dev
```

The frontend starts on `http://localhost:5173`.

Open `http://localhost:5173` for the public website and `http://localhost:5173/admin` for the dashboard.

### Running both concurrently (optional)

If you have a root-level `package.json` with a `concurrently` script:

```bash
npm run dev
```

Otherwise run the two `npm run dev` commands in separate terminals as shown above.

---

## Building for Production

Build the frontend first, then the server. The server serves the compiled frontend as static files.

```bash
# Build the frontend
cd frontend
npm run build

# Build the server
cd ../server
npm run build
```

Start the production server:

```bash
cd server
NODE_ENV=production node dist/index.js
```

The server will serve the frontend's `dist/` folder at the root path and all API routes under `/api`. Only one port (`PORT`, default `5000`) is needed.

To point the server at a custom frontend build location:

```env
FRONTEND_DIST_DIR=/path/to/frontend/dist
```

---

## Seeding an Admin User

After the database is set up and the server environment file is configured, create the first admin account:

```bash
cd server
npm run seed:admin
```

This reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `server/.env` and creates an admin user. If the email already exists, the script promotes the existing user to admin. Run this once on a fresh database before logging in.

Log in at `http://localhost:5173/admin/login` (development) using the credentials you set.

---

## API Overview

All API routes are mounted under `/api`. Authentication uses a Bearer JWT token obtained from `POST /api/auth/login`.

| Group | Base path | Auth required |
|---|---|---|
| Auth | `/api/auth` | Login: no. All others: yes |
| Applications (cohort pipeline) | `/api/applications` | Yes |
| Program applications (general pipeline) | `/api/program-applications` | Yes |
| Programs and cohorts | `/api/programs`, `/api/cohorts` | Yes |
| Forms | `/api/forms` | Yes |
| Announcements | `/api/announcements` | Yes |
| Events | `/api/events` | Yes |
| CMS | `/api/cms` | Yes |
| Profiles | `/api/profiles` | Yes |
| Attendance | `/api/attendance` | Yes |
| Contact inbox | `/api/contact` (admin) | Yes |
| Message templates | `/api/message-templates` | Yes |
| Messages | `/api/overview/messages` | Yes |
| Notifications | `/api/notifications` | Yes |
| Activity logs | `/api/logs` | Yes |
| Admin management | `/api/admins` | Super admin only |
| Overview | `/api/overview` | Yes |
| Subscribers | `/api/admin/subscribers` | Yes |
| WhatsApp direct | `/api/whatsapp` | Yes |
| Public content | `/api/public/*` | No |
| Public apply | `/api/public/cohorts/:id/apply`, `/api/public/apply` | No |
| Subscribe / unsubscribe | `/api/subscribe`, `/api/unsubscribe` | No |
| Contact form | `/api/contact` (POST) | No |

All successful responses follow the envelope format:

```json
{
  "success": true,
  "data": { },
  "message": "Optional message"
}
```

List responses include a `pagination` object:

```json
{
  "success": true,
  "data": [ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 84,
    "totalPages": 5
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { }
  }
}
```

---

## Key Workflows

### Cohort admissions pipeline

An applicant submits via the public `/apply` page. The admin reviews, shortlists, schedules an interview, receives confirmation from the applicant via a tokenized link, sets a decision, and creates a user account and enrollment. The applicant receives credential emails with a sign-in link.

Pipeline stages in order:

```
applied -> reviewing -> invited_to_interview -> interview_confirmed
       -> interview_completed -> accepted -> participation_confirmed
```

Rejection is allowed from any active stage.

### General program applications

A parallel pipeline for applicants not tied to a specific cohort. Shares the same interview and messaging infrastructure as the cohort pipeline. Accepted applicants can be linked to a cohort and converted to enrollments.

### Messaging

Admins compose and send email and WhatsApp messages from within each application's detail view. Messages are stored as draft records, sent via the configured provider, and marked sent or failed. Failed messages appear in the overview and can be retried individually or in bulk.

### Announcement broadcast

An admin publishes an announcement and chooses to broadcast it. The system sends the announcement to selected users (email or WhatsApp) and optionally to website subscribers. When subscribers are included, the system automatically matches the announcement to the relevant subscriber preference — event announcements go to event subscribers, cohort announcements go to program subscribers — without requiring the admin to select topics manually.

### Public subscriptions

Visitors enter their phone number on the website and choose which topics they want to hear about (open programs, upcoming events, announcements, etc.). When a relevant announcement is broadcast, matching subscribers receive a WhatsApp message automatically. Subscribers can opt out at any time via the unsubscribe endpoint.

---

## Configuration Notes

**Redis is optional.** If `REDIS_URL` is not set or Redis is unavailable, the application continues normally. Rate limiting on public endpoints and public content caching are silently disabled. The last-known-good cache strategy for theme and home sections is also unavailable.

**WhatsApp is optional.** If neither Meta nor Twilio credentials are configured, WhatsApp sends throw a `503 WHATSAPP_NOT_CONFIGURED` error. Email continues to work independently. Set `WHATSAPP_PROVIDER=meta` and provide `META_WA_TOKEN` and `META_PHONE_NUMBER_ID` to enable Meta Cloud API messaging.

**SMTP is optional in development.** If no SMTP credentials are provided, email sending will fail silently or throw. For local development, use a tool like [Mailpit](https://mailpit.axllent.org/) or [Mailtrap](https://mailtrap.io/) and point `SMTP_HOST` and `SMTP_PORT` at it.

**Production environment validation.** When `NODE_ENV=production`, the server performs strict validation on startup and refuses to start if required variables are missing or still set to placeholder values. Required in production: `DATABASE_URL` (or individual `PG*` vars), `JWT_SECRET` (minimum 48 characters), `CORS_ORIGIN`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `DIGITAL_HUB_EMAIL`, `PUBLIC_API_BASE_URL`, and `LEARNER_SIGNIN_URL`. The flags `AUTH_FORGOT_ALLOW_ANY_EMAIL` and `AUTH_DEBUG_RETURN_RESET_TOKEN` must be absent or set to `false`.

**CORS.** Set `CORS_ORIGIN` to a comma-separated list of allowed origins. Local and private network origins are always allowed in non-production environments regardless of this setting.

**File uploads.** Program images are stored in `server/uploads/programs/`. Ensure this directory is writable by the server process and persisted across deploys (it is not included in the repository).