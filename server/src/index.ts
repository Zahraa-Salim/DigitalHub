// File: server/src/index.ts
// Purpose: Creates the Express app, applies core middleware, and mounts the server routes.
// It is the main backend entry point used to start the API.

import cors from "cors";
import type { CorsOptions, CorsOptionsDelegate } from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db/index.js";
import type { DbClient } from "./db/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { validatePagination } from "./middleware/validatePagination.js";
import { announcementsRouter } from "./routes/announcements.routes.js";
import { attendanceRouter } from "./routes/attendance.routes.js";
import { adminFormsRouter } from "./routes/adminForms.routes.js";
import { adminsRouter } from "./routes/admins.routes.js";
import { applicationsRouter } from "./routes/applications.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { cmsRouter } from "./routes/cms.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { eventsRouter } from "./routes/events.routes.js";
import { formsRouter } from "./routes/forms.routes.js";
import { logsRouter } from "./routes/logs.routes.js";
import { messageTemplatesRouter } from "./routes/messageTemplates.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { overviewRouter } from "./routes/overview.routes.js";
import { profilesRouter } from "./routes/profiles.routes.js";
import { projectsRouter } from "./routes/projects.routes.js";
import { programApplicationsRouter } from "./routes/programApplications.routes.js";
import { programsRouter } from "./routes/programs.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { subscribersRouter } from "./routes/subscribers.routes.js";
import { whatsappRouter } from "./routes/whatsapp.routes.js";
import { AppError } from "./utils/appError.js";
import { sendSuccess } from "./utils/httpResponse.js";
import { validateProductionEnv } from "./utils/validateProductionEnv.js";
dotenv.config();
validateProductionEnv();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
const defaultFrontendDistDir = path.resolve(__dirname, "../../frontend/dist");
const frontendDistDir = process.env.FRONTEND_DIST_DIR
    ? path.resolve(process.env.FRONTEND_DIST_DIR)
    : defaultFrontendDistDir;
const frontendIndexFile = path.join(frontendDistDir, "index.html");
type RouteLayer = {
    route?: {
        path?: string;
        methods?: Record<string, boolean>;
    };
    name?: string;
    handle?: {
        stack?: RouteLayer[];
    };
    regexp?: RegExp | string;
};

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Handles 'normalizeOrigin' workflow for this module.
const normalizeOrigin = (value: unknown): string => String(value || "").trim().replace(/\/+$/g, "");
const configuredCorsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN
        .split(",")
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean)
    : [];
// Handles 'isPrivateDevOrigin' workflow for this module.
const isPrivateDevOrigin = (origin: unknown): boolean => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(String(origin || ""));
// Handles 'parseForwardedPart' workflow for this module.
const parseForwardedPart = (value: unknown): string => String(value || "").split(",")[0]?.trim() || "";
// Handles 'getRequestOriginCandidates' workflow for this module.
const getRequestOriginCandidates = (req: Request): string[] => {
    const host = parseForwardedPart(req.headers["x-forwarded-host"]) || req.get("host") || "";
    const proto = parseForwardedPart(req.headers["x-forwarded-proto"]) || req.protocol || "http";
    if (!host) {
        return [];
    }
    const normalizedHost = host.trim();
    return [`${proto}://${normalizedHost}`, `https://${normalizedHost}`, `http://${normalizedHost}`]
        .map((entry) => normalizeOrigin(entry))
        .filter(Boolean);
};
// Handles 'isAllowedCorsOrigin' workflow for this module.
const isAllowedCorsOrigin = (origin: string | undefined, req: Request): boolean => {
    if (!origin) {
        return true;
    }
    const normalizedOrigin = normalizeOrigin(origin);
    if (configuredCorsOrigins.includes(normalizedOrigin)) {
        return true;
    }
    if (getRequestOriginCandidates(req).includes(normalizedOrigin)) {
        return true;
    }
    if (process.env.NODE_ENV !== "production" && isPrivateDevOrigin(normalizedOrigin)) {
        return true;
    }
    return false;
};
// Handles 'corsOptionsDelegate' workflow for this module.
const corsOptionsDelegate: CorsOptionsDelegate<Request> = (req, callback) => {
    const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    const corsOptions: CorsOptions = {
        origin: false,
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
        methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    };
    const originCallback = (origin: string | undefined, originResult: (err: Error | null, allow?: boolean) => void): void => {
        if (isAllowedCorsOrigin(origin, req)) {
            originResult(null, true);
            return;
        }
        originResult(new AppError(403, "FORBIDDEN", `CORS origin not allowed: ${origin}`));
    };
    originCallback(requestOrigin, (error: Error | null, allow?: boolean) => {
        if (error) {
            callback(error, corsOptions);
            return;
        }
        corsOptions.origin = Boolean(allow);
        callback(null, corsOptions);
    });
};
app.use(cors(corsOptionsDelegate));
app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers.origin) {
        res.header("Access-Control-Allow-Credentials", "true");
    }
    next();
});
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "8mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use(validatePagination);
if (fs.existsSync(frontendIndexFile)) {
    app.use(express.static(frontendDistDir));
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
            return next();
        }
        const accepts = String(req.headers.accept || "");
        if (!accepts.includes("text/html")) {
            return next();
        }
        const pathName = req.path || "";
        if (path.extname(pathName)) {
            return next();
        }
        const apiOnlyPrefixes = [
            "/health",
            "/public",
            "/api",
            "/auth",
            "/cms",
            "/profiles",
            "/applications",
            "/program-applications",
            "/admins",
            "/announcements",
            "/attendance",
            "/forms",
            "/message-templates",
            "/notifications",
            "/logs",
            "/projects",
            "/uploads",
        ];
        const isApiOnlyPath = apiOnlyPrefixes.some((prefix) => pathName === prefix || pathName.startsWith(`${prefix}/`));
        if (isApiOnlyPath) {
            return next();
        }
        return res.sendFile(frontendIndexFile);
    });
}
app.get("/", (_req, res) => {
    sendSuccess(res, { status: "ok" }, "Digital Hub API is running.");
});
app.get("/health", async (_req: Request, res: Response, next: NextFunction) => {
    try {
        await pool.query("SELECT 1");
        sendSuccess(res, { status: "ok" });
    }
    catch (error) {
        next(error);
    }
});
app.use("/auth", authRouter);
app.use("/api/auth", authRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api", subscribersRouter);
app.use("/cms", cmsRouter);
app.use(programsRouter);
app.use(subscribersRouter);
app.use("/profiles", profilesRouter);
app.use("/applications", applicationsRouter);
app.use("/program-applications", programApplicationsRouter);
app.use("/admin/program-applications", programApplicationsRouter);
app.use("/admin", adminFormsRouter);
app.use("/admin/admins", adminsRouter);
app.use("/admins", adminsRouter);
app.use("/announcements", announcementsRouter);
app.use("/attendance", attendanceRouter);
app.use("/events", eventsRouter);
app.use("/forms", formsRouter);
app.use("/admin/forms", formsRouter);
app.use("/admin/overview", overviewRouter);
app.use("/message-templates", messageTemplatesRouter);
app.use("/contact", contactRouter);
app.use("/notifications", notificationsRouter);
app.use("/logs", logsRouter);
app.use(projectsRouter);
app.use("/public", publicRouter);

app.use(notFound);
app.use(errorHandler);

// Handles 'slugifyValue' workflow for this module.
function slugifyValue(value: unknown): string {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}

// Handles 'ensureSoftDeleteColumns' workflow for this module.
async function ensureSoftDeleteColumns() {
    await pool.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS application_form_id BIGINT REFERENCES forms(id) ON DELETE SET NULL;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS use_general_form BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS use_general_form BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS application_form_id BIGINT;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS attendance_days JSONB NOT NULL DEFAULT '["monday","tuesday","wednesday","thursday"]'::jsonb;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS attendance_start_time TIME;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS attendance_end_time TIME;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_answers JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS review_message TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS completion_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS post_body TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS featured_image_url TEXT;
      UPDATE events SET completion_image_urls = '[]'::jsonb WHERE completion_image_urls IS NULL;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS event_id BIGINT;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS cta_label TEXT;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS cta_url TEXT;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS cta_open_in_new_tab BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
      ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS skills TEXT;
      ALTER TABLE instructor_profiles ADD COLUMN IF NOT EXISTS skills TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS idx_users_reset_password_token
        ON users (reset_password_token);
      CREATE TABLE IF NOT EXISTS media_assets (
        id BIGSERIAL PRIMARY KEY,
        file_name TEXT NOT NULL UNIQUE,
        original_name TEXT,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
        storage_path TEXT NOT NULL,
        public_url TEXT NOT NULL UNIQUE,
        alt_text TEXT,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_media_assets_created_at
        ON media_assets (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_media_assets_file_name
        ON media_assets (file_name);
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id BIGSERIAL PRIMARY KEY,
        cohort_id BIGINT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
        attendance_date DATE NOT NULL,
        location_type TEXT NOT NULL DEFAULT 'on_site',
        submitted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT attendance_sessions_location_type_check CHECK (location_type IN ('remote', 'on_site')),
        CONSTRAINT attendance_sessions_unique_cohort_day UNIQUE (cohort_id, attendance_date)
      );
      CREATE TABLE IF NOT EXISTS attendance_records (
        id BIGSERIAL PRIMARY KEY,
        session_id BIGINT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attendance_status TEXT NOT NULL DEFAULT 'present',
        note TEXT,
        marked_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT attendance_records_status_check CHECK (attendance_status IN ('present', 'absent', 'late')),
        CONSTRAINT attendance_records_unique_student_per_session UNIQUE (session_id, student_user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_attendance_sessions_cohort_date
        ON attendance_sessions (cohort_id, attendance_date DESC);
      CREATE INDEX IF NOT EXISTS idx_attendance_records_student
        ON attendance_records (student_user_id, marked_at DESC);
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS admin_status TEXT;
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS dropout_reason TEXT;
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
      ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS status_updated_by BIGINT;
      UPDATE student_profiles sp
      SET admin_status = CASE
        WHEN COALESCE(NULLIF(sp.admin_status, ''), '') <> '' THEN sp.admin_status
        WHEN EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = sp.user_id
            AND u.is_active = FALSE
        ) THEN 'dropout'
        ELSE 'active'
      END
      WHERE sp.admin_status IS NULL OR sp.admin_status = '';
      ALTER TABLE student_profiles ALTER COLUMN admin_status SET DEFAULT 'active';
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'student_profiles_admin_status_check'
            AND conrelid = 'student_profiles'::regclass
        ) THEN
          ALTER TABLE student_profiles
            ADD CONSTRAINT student_profiles_admin_status_check
            CHECK (admin_status IN ('active', 'dropout'));
        END IF;
      END $$;

      -- Drop legacy/unknown applications check constraints before data normalization.
      DO $$
      DECLARE
        c RECORD;
      BEGIN
        FOR c IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'applications'::regclass
            AND contype = 'c'
            AND (
              pg_get_constraintdef(oid) ILIKE '%status%'
              OR pg_get_constraintdef(oid) ILIKE '%stage%'
            )
        LOOP
          EXECUTE format('ALTER TABLE applications DROP CONSTRAINT %I', c.conname);
        END LOOP;
      END $$;

      -- Ensure modern applications status enum values.
      UPDATE applications
      SET status = CASE
        WHEN status = 'pending' THEN 'applied'
        WHEN status = 'waitlisted' THEN 'reviewing'
        WHEN status = 'approved' THEN 'accepted'
        ELSE status
      END;

      -- Keep stage in sync when it already carries legacy pipeline labels,
      -- and backfill stage when missing.
      UPDATE applications
      SET stage = CASE
        WHEN stage = 'submitted' THEN 'applied'
        WHEN stage = 'reviewed' THEN 'reviewing'
        WHEN stage = 'shortlisted' THEN 'reviewing'
        WHEN stage = 'interview_scheduled' THEN 'invited_to_interview'
        WHEN stage = 'interview_completed' THEN 'interview_completed'
        WHEN stage = 'user_created' THEN 'participation_confirmed'
        WHEN stage IS NULL OR stage = '' THEN CASE
          WHEN status = 'applied' THEN 'applied'
          WHEN status = 'reviewing' THEN 'reviewing'
          WHEN status = 'invited_to_interview' THEN 'invited_to_interview'
          WHEN status = 'interview_confirmed' THEN 'interview_confirmed'
          WHEN status = 'interview_completed' THEN 'interview_completed'
          WHEN status = 'accepted' THEN 'accepted'
          WHEN status = 'rejected' THEN 'rejected'
          WHEN status = 'participation_confirmed' THEN 'participation_confirmed'
          ELSE 'applied'
        END
        ELSE stage
      END;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'applications_status_check'
            AND conrelid = 'applications'::regclass
        ) THEN
          ALTER TABLE applications
            ADD CONSTRAINT applications_status_check
            CHECK (
              status IN (
                'applied',
                'reviewing',
                'invited_to_interview',
                'interview_confirmed',
                'interview_completed',
                'accepted',
                'rejected',
                'participation_confirmed'
              )
            );
        END IF;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'applications_stage_check'
            AND conrelid = 'applications'::regclass
        ) THEN
          ALTER TABLE applications
            ADD CONSTRAINT applications_stage_check
            CHECK (
              stage IN (
                'applied',
                'reviewing',
                'invited_to_interview',
                'interview_confirmed',
                'interview_completed',
                'accepted',
                'rejected',
                'participation_confirmed'
              )
            );
        END IF;
      END $$;

      UPDATE cohorts
      SET status = 'coming_soon', updated_at = NOW()
      WHERE status = 'planned'
        AND deleted_at IS NULL;

      ALTER TABLE IF EXISTS cohorts
        ADD COLUMN IF NOT EXISTS auto_announce BOOLEAN NOT NULL DEFAULT FALSE;

      ALTER TABLE IF EXISTS events
        ADD COLUMN IF NOT EXISTS auto_announce BOOLEAN NOT NULL DEFAULT FALSE;

      DO $$
      BEGIN
        ALTER TABLE form_fields DROP CONSTRAINT IF EXISTS form_fields_type_check;
        ALTER TABLE form_fields ADD CONSTRAINT form_fields_type_check
          CHECK (type IN (
            'text', 'textarea', 'email', 'phone', 'select',
            'checkbox', 'radio', 'date', 'file', 'number', 'url'
          ));
      EXCEPTION WHEN others THEN
        NULL;
      END $$;
    `);
}

// Handles 'ensureSubscribersTable' workflow for this module.
async function ensureSubscribersTable(client: DbClient) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id             SERIAL PRIMARY KEY,
        phone          TEXT NOT NULL,
        name           TEXT,
        preferences    TEXT[] NOT NULL DEFAULT '{}',
        is_active      BOOLEAN NOT NULL DEFAULT TRUE,
        opted_out_at   TIMESTAMPTZ,
        source         TEXT NOT NULL DEFAULT 'website',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS subscribers_phone_unique ON subscribers (phone)
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriber_messages (
        id              SERIAL PRIMARY KEY,
        subscriber_id   INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
        announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
        sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (subscriber_id, announcement_id)
      )
    `);
}

// Handles 'ensureStudentProfileUserLinks' workflow for this module.
async function ensureStudentProfileUserLinks() {
    const orphanProfilesResult = await pool.query(`
      SELECT
        sp.ctid::text AS row_ref,
        sp.full_name,
        sp.public_slug
      FROM student_profiles sp
      LEFT JOIN users u ON u.id = sp.user_id
      WHERE sp.user_id IS NULL OR u.id IS NULL
    `);
    if (!orphanProfilesResult.rowCount) {
        return;
    }
    const placeholderHash = await bcrypt.hash("ChangeMe123!", 10);
    for (let index = 0; index < orphanProfilesResult.rows.length; index += 1) {
        const row = orphanProfilesResult.rows[index];
        const baseSlug = slugifyValue(row.public_slug || row.full_name || `student-${index + 1}`) || `student-${index + 1}`;
        const userResult = await pool.query(`
          INSERT INTO users (
            email,
            password_hash,
            is_student,
            is_active,
            created_at,
            updated_at
          )
          VALUES ($1, $2, TRUE, TRUE, NOW(), NOW())
          RETURNING id
        `, [`${baseSlug}-${Date.now()}-${index + 1}@digitalhub.local`, placeholderHash]);
        const userId = Number(userResult.rows[0]?.id);
        const generatedSlug = row.public_slug
            ? slugifyValue(row.public_slug)
            : `${baseSlug}-${userId}`;
        await pool.query(`
          UPDATE student_profiles
          SET user_id = $1,
              public_slug = COALESCE(NULLIF(public_slug, ''), $2)
          WHERE ctid = $3::tid
        `, [userId, generatedSlug, row.row_ref]);
    }
}

// Handles 'startServer' workflow for this module.
async function startServer() {
    try {
        await pool.query("SELECT 1");
        await ensureSoftDeleteColumns();
        await ensureSubscribersTable(pool);
        await ensureStudentProfileUserLinks();
        const port = Number(process.env.PORT || 5000);
        app.listen(port, () => {
            console.log(`Digital Hub server listening on http://localhost:${port}`);
            if (String(process.env.LOG_ROUTES || "").trim().toLowerCase() === "true") {
                const routes = collectRoutes(app);
                console.log("[routes] Registered routes:");
                routes.forEach((route) => console.log(`[routes] ${route}`));
            }
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
// Handles 'collectRoutes' workflow for this module.
function collectRoutes(application: Express): string[] {
    const routes: string[] = [];
    const stack = ((application as Express & { router?: { stack?: RouteLayer[]; }; }).router?.stack || []) as RouteLayer[];
    // Handles 'walk' workflow for this module.
    const walk = (layerStack: RouteLayer[], prefix = ""): void => {
        for (const layer of layerStack) {
            if (layer.route?.path) {
                const methods = Object.keys(layer.route.methods || {})
                    .filter((method) => layer.route?.methods?.[method])
                    .map((method) => method.toUpperCase())
                    .join(",");
                routes.push(`${methods} ${prefix}${layer.route.path}`);
                continue;
            }
            if (layer.name === "router" && layer.handle?.stack) {
                const raw = String(layer.regexp || "");
                const match = raw.match(/\\\/([^\\]+)\\\/\\\?\(\?=\\\/\|\$\)/);
                const fragment = match?.[1] ? `/${match[1].replace(/\\\//g, "/")}` : "";
                walk(layer.handle.stack, `${prefix}${fragment}`);
            }
        }
    };
    walk(stack);
    return Array.from(new Set(routes)).sort();
}

