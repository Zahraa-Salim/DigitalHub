// File: server/src/index.ts
// Purpose: Creates the Express app, applies core middleware, and mounts the server routes.
// It is the main backend entry point used to start the API.

import cors from "cors";
import type { CorsOptions, CorsOptionsDelegate } from "cors";
import dotenv from "dotenv";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runStartupMigrations } from "./db/migrations.js";
import { pool } from "./db/index.js";
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
import { importRouter } from "./routes/import.routes.js";
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
            "/events",
            "/contact",
            "/cohorts",
            "/subscribe",
            "/unsubscribe",
            "/whatsapp",
            "/overview",
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

// programsRouter owns /programs and /cohorts at root level (intentional, no prefix)
app.use(programsRouter);
app.use("/profiles", profilesRouter);
app.use("/applications", applicationsRouter);
app.use("/program-applications", programApplicationsRouter);
app.use("/admin/program-applications", programApplicationsRouter);
app.use("/admin", adminFormsRouter);
app.use("/admin", importRouter);
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

// projectsRouter owns /projects at root level (intentional, no prefix)
app.use(projectsRouter);
app.use("/public", publicRouter);

app.use(notFound);
app.use(errorHandler);

// Handles 'startServer' workflow for this module.
async function startServer() {
    try {
        await pool.query("SELECT 1");
        await runStartupMigrations(pool);
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
