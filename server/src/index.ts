// File Summary: server/src/index.ts
// Layer: root
// Purpose: Bootstraps Express, mounts all route modules, and starts the API server.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { validatePagination } from "./middleware/validatePagination.js";
import { announcementsRouter } from "./routes/announcements.routes.js";
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
import { sendSuccess } from "./utils/httpResponse.js";
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : true;
app.use(cors({
    origin: allowedOrigins,
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "8mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use(validatePagination);
app.get("/", (_req, res) => {
    sendSuccess(res, { status: "ok" }, "Digital Hub API is running.");
});
app.get("/health", async (_req, res, next) => {
    try {
        await pool.query("SELECT 1");
        sendSuccess(res, { status: "ok" });
    }
    catch (error) {
        next(error);
    }
});
app.use("/auth", authRouter);
app.use("/cms", cmsRouter);
app.use(programsRouter);
app.use("/profiles", profilesRouter);
app.use("/applications", applicationsRouter);
app.use("/program-applications", programApplicationsRouter);
app.use("/admin/program-applications", programApplicationsRouter);
app.use("/admin", adminFormsRouter);
app.use("/admin/admins", adminsRouter);
app.use("/admins", adminsRouter);
app.use("/announcements", announcementsRouter);
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
async function ensureSoftDeleteColumns() {
    await pool.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS use_general_form BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS application_form_id BIGINT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_answers JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS review_message TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

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
        WHEN stage = 'interview_completed' THEN 'interview_confirmed'
        WHEN stage = 'user_created' THEN 'participation_confirmed'
        WHEN stage IS NULL OR stage = '' THEN CASE
          WHEN status = 'applied' THEN 'applied'
          WHEN status = 'reviewing' THEN 'reviewing'
          WHEN status = 'invited_to_interview' THEN 'invited_to_interview'
          WHEN status = 'interview_confirmed' THEN 'interview_confirmed'
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
    `);
}
async function startServer() {
    try {
        await pool.query("SELECT 1");
        await ensureSoftDeleteColumns();
        const port = Number(process.env.PORT || 5000);
        app.listen(port, () => {
            console.log(`Digital Hub server listening on http://localhost:${port}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
