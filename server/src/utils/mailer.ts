// File: server/src/utils/mailer.ts
// Purpose: Provides shared helper logic for mailer.
// It supports other backend modules with reusable utility functions.

import { createRequire } from "node:module";
import { pool } from "../db/index.js";
import { AppError } from "./appError.js";

const require = createRequire(import.meta.url);

type MailTransportOptions = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

type MailTransporter = {
  sendMail(options: MailTransportOptions): Promise<unknown>;
};

const nodemailer = require("nodemailer") as {
  createTransport(options: unknown): MailTransporter;
};

type MailerConfig = {
  service: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
};

type SiteSettingsRow = {
  contact_info?: {
    email?: string;
  } | null;
};

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

type SendEmailResult = {
  mode: "mock" | "smtp";
  from: string;
  to: string;
  subject: string;
};

let cachedTransporter: MailTransporter | null = null;
let cachedConfigSignature: string | null = null;
let warnedMockMode = false;
let cachedSiteSender: string | null = null;
let cachedSiteSenderExpiresAt = 0;

// Handles 'parseBoolean' workflow for this module.
function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

// Handles 'escapeHtml' workflow for this module.
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Handles 'buildHtmlFromText' workflow for this module.
function buildHtmlFromText(text: string): string {
  return `<div style="white-space:pre-line;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;">${escapeHtml(
    text,
  )}</div>`;
}

// Handles 'readMailerEnvConfig' workflow for this module.
function readMailerEnvConfig(): MailerConfig {
  const service = process.env.SMTP_SERVICE?.trim() || process.env.EMAIL_SERVICE?.trim() || "";
  const host = process.env.SMTP_HOST?.trim() || "";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const user = process.env.SMTP_USER?.trim() || process.env.EMAIL_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || process.env.EMAIL_PASS?.trim() || "";
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "Digital Hub";

  return {
    service,
    host,
    port,
    secure,
    user,
    pass,
    fromName,
  };
}

// Handles 'isSmtpUsable' workflow for this module.
function isSmtpUsable(config: MailerConfig): boolean {
  if ((config.user && !config.pass) || (!config.user && config.pass)) return false;
  if (config.service) {
    return Boolean(config.user && config.pass);
  }
  if (!config.host) return false;
  if (!Number.isFinite(config.port) || config.port <= 0) return false;
  return true;
}

// Handles 'getTransporter' workflow for this module.
function getTransporter(config: MailerConfig): MailTransporter {
  const signature = JSON.stringify({
    service: config.service,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
  });

  if (cachedTransporter && cachedConfigSignature === signature) {
    return cachedTransporter;
  }

  if (config.service) {
    cachedTransporter = nodemailer.createTransport({
      service: config.service,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  } else {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? {
            user: config.user,
            pass: config.pass,
          }
        : undefined,
    });
  }
  cachedConfigSignature = signature;
  return cachedTransporter;
}

// Handles 'getSiteSettingsSenderEmail' workflow for this module.
async function getSiteSettingsSenderEmail(): Promise<string | null> {
  const now = Date.now();
  if (now < cachedSiteSenderExpiresAt) {
    return cachedSiteSender;
  }

  try {
    const result = await pool.query<SiteSettingsRow>(
      `
        SELECT contact_info
        FROM site_settings
        WHERE id = 1
        LIMIT 1
      `,
    );

    const contactInfo = result.rows[0]?.contact_info;
    const emailValue = typeof contactInfo?.email === "string" ? contactInfo.email.trim() : "";

    cachedSiteSender = emailValue || null;
  } catch {
    cachedSiteSender = null;
  } finally {
    cachedSiteSenderExpiresAt = now + 60_000;
  }

  return cachedSiteSender;
}

// Handles 'resolveFromAddress' workflow for this module.
async function resolveFromAddress(config: MailerConfig): Promise<string> {
  const siteSender = await getSiteSettingsSenderEmail();
  if (siteSender) return siteSender;
  return (
    process.env.DIGITAL_HUB_EMAIL?.trim() ||
    process.env.MAIL_FROM_ADDRESS?.trim() ||
    config.user ||
    ""
  );
}

// Handles 'sendDigitalHubEmail' workflow for this module.
export async function sendDigitalHubEmail({ to, subject, body }: SendEmailInput): Promise<SendEmailResult> {
  const destination = String(to || "").trim();
  const subjectLine = String(subject || "").trim();
  const messageBody = String(body || "").trim();

  if (!destination) {
    throw new AppError(400, "VALIDATION_ERROR", "Email destination is required.");
  }
  if (!subjectLine) {
    throw new AppError(400, "VALIDATION_ERROR", "Email subject is required.");
  }
  if (!messageBody) {
    throw new AppError(400, "VALIDATION_ERROR", "Email body is required.");
  }

  const config = readMailerEnvConfig();
  const fromAddress = await resolveFromAddress(config);
  const isProduction = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
  if (!fromAddress) {
    throw new AppError(
      500,
      "EMAIL_NOT_CONFIGURED",
      "Digital Hub sender email is not configured in site settings or env.",
    );
  }

  if (!isSmtpUsable(config)) {
    if (isProduction) {
      throw new AppError(500, "EMAIL_NOT_CONFIGURED", "SMTP is not fully configured.");
    }
    if (!warnedMockMode) {
      warnedMockMode = true;
      console.warn(
        "[mailer] SMTP is not fully configured. Email sends are running in mock mode.",
      );
    }
    return {
      mode: "mock",
      from: fromAddress,
      to: destination,
      subject: subjectLine,
    };
  }

  const transporter = getTransporter(config);
  await transporter.sendMail({
    from: `"${config.fromName}" <${fromAddress}>`,
    to: destination,
    subject: subjectLine,
    text: messageBody,
    html: buildHtmlFromText(messageBody),
  });

  return {
    mode: "smtp",
    from: fromAddress,
    to: destination,
    subject: subjectLine,
  };
}

