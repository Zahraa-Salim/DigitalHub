// File Summary: server/src/index.ts
// Layer: root
// Purpose: Bootstraps Express, mounts all route modules, and starts the API server.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { pool } from "./db/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { validatePagination } from "./middleware/validatePagination.js";
import { announcementsRouter } from "./routes/announcements.routes.js";
import { applicationsRouter } from "./routes/applications.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { cmsRouter } from "./routes/cms.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { eventsRouter } from "./routes/events.routes.js";
import { logsRouter } from "./routes/logs.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { profilesRouter } from "./routes/profiles.routes.js";
import { programsRouter } from "./routes/programs.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { sendSuccess } from "./utils/httpResponse.js";
dotenv.config();
const app = express();
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : true;
app.use(cors({
    origin: allowedOrigins,
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
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
app.use("/announcements", announcementsRouter);
app.use("/events", eventsRouter);
app.use("/contact", contactRouter);
app.use("/notifications", notificationsRouter);
app.use("/logs", logsRouter);
app.use("/public", publicRouter);
app.use(notFound);
app.use(errorHandler);
async function startServer() {
    try {
        await pool.query("SELECT 1");
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


