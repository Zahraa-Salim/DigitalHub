// File Summary: server/src/index.ts
// Layer: root
// Purpose: Bootstraps Express, mounts all route modules, and starts the API server.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { pool } from "./db/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { validatePagination } from "./middleware/validatePagination.js";
import { announcementsRouter } from "./routes/announcements.routes.js";
import { adminsRouter } from "./routes/admins.routes.js";
import { applicationsRouter } from "./routes/applications.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { cmsRouter } from "./routes/cms.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { eventsRouter } from "./routes/events.routes.js";
import { logsRouter } from "./routes/logs.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { profilesRouter } from "./routes/profiles.routes.js";
import { projectsRouter } from "./routes/projects.routes.js";
import { programsRouter } from "./routes/programs.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { sendSuccess } from "./utils/httpResponse.js";
dotenv.config();
const app = express();
const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : true;
const isDevEnvironment = process.env.NODE_ENV !== "production";
const localhostOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
app.use(cors({
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }
        if (isDevEnvironment) {
            callback(null, true);
            return;
        }
        if (configuredOrigins === true) {
            callback(null, true);
            return;
        }
        if (configuredOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        if (localhostOriginRegex.test(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Not allowed by CORS"));
    },
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
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
app.use("/api/admins", adminsRouter);
app.use("/cms", cmsRouter);
app.use(programsRouter);
app.use("/profiles", profilesRouter);
app.use("/applications", applicationsRouter);
app.use("/announcements", announcementsRouter);
app.use("/events", eventsRouter);
app.use("/contact", contactRouter);
app.use("/notifications", notificationsRouter);
app.use("/logs", logsRouter);
app.use(projectsRouter);
app.use("/public", publicRouter);
app.use("/api/public", publicRouter);
app.use(notFound);
app.use(errorHandler);
async function ensureSoftDeleteColumns() {
    await pool.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE programs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
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


