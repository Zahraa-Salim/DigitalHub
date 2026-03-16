// File: server/src/utils/validateProductionEnv.ts
// Purpose: Provides shared helper logic for validate production env.
// It supports other backend modules with reusable utility functions.



import { AppError } from "./appError.js";

// Handles 'isTruthy' workflow for this module.
function isTruthy(value: string | undefined): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

// Handles 'looksLikePlaceholder' workflow for this module.
function looksLikePlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes("replace_with") ||
    normalized.includes("your_") ||
    normalized.includes("changeme") ||
    normalized.includes("example.com")
  );
}

// Handles 'requireEnv' workflow for this module.
function requireEnv(name: string, minLen = 1): string {
  const value = String(process.env[name] || "").trim();
  if (!value || value.length < minLen) {
    throw new AppError(500, "INTERNAL_ERROR", `Missing required production env: ${name}`);
  }
  if (looksLikePlaceholder(value)) {
    throw new AppError(500, "INTERNAL_ERROR", `Production env '${name}' is still a placeholder.`);
  }
  return value;
}

// Handles 'validateProductionEnv' workflow for this module.
export function validateProductionEnv() {
  const nodeEnv = String(process.env.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv !== "production") return;

  const hasDatabaseUrl = Boolean(String(process.env.DATABASE_URL || "").trim());
  if (hasDatabaseUrl) {
    requireEnv("DATABASE_URL", 12);
  } else {
    requireEnv("PGHOST", 3);
    requireEnv("PGDATABASE", 2);
    requireEnv("PGUSER", 2);
    requireEnv("PGPASSWORD", 8);
  }

  requireEnv("JWT_SECRET", 48);
  requireEnv("CORS_ORIGIN", 5);

  const forgotAnyEmail = isTruthy(process.env.AUTH_FORGOT_ALLOW_ANY_EMAIL);
  if (forgotAnyEmail) {
    throw new AppError(500, "INTERNAL_ERROR", "AUTH_FORGOT_ALLOW_ANY_EMAIL must be false in production.");
  }

  const returnResetToken = isTruthy(process.env.AUTH_DEBUG_RETURN_RESET_TOKEN);
  if (returnResetToken) {
    throw new AppError(500, "INTERNAL_ERROR", "AUTH_DEBUG_RETURN_RESET_TOKEN must be false in production.");
  }

  requireEnv("SMTP_HOST", 3);
  requireEnv("SMTP_USER", 3);
  requireEnv("SMTP_PASS", 8);
  requireEnv("DIGITAL_HUB_EMAIL", 5);
  requireEnv("PUBLIC_API_BASE_URL", 10);
  requireEnv("LEARNER_SIGNIN_URL", 10);

  const metaApiVersion = String(process.env.META_WA_API_VERSION || "").trim();
  if (metaApiVersion && looksLikePlaceholder(metaApiVersion)) {
    throw new AppError(500, "INTERNAL_ERROR", "Production env 'META_WA_API_VERSION' is still a placeholder.");
  }
}

