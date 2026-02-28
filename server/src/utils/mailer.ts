// File Summary: server/src/utils/mailer.ts
// Layer: utils
// Purpose: Sends outbound emails through configured SMTP using a fixed sender identity.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import nodemailer from "nodemailer";
import { pool } from "../db/index.js";
import { AppError } from "./appError.js";

let cachedTransporter = null;
let cachedConfigSignature = null;
let warnedMockMode = false;
let cachedSiteSender = null;
let cachedSiteSenderExpiresAt = 0;

function parseBoolean(value, fallback = false) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtmlFromText(text) {
  return `<div style="white-space:pre-line;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;">${escapeHtml(
    text,
  )}</div>`;
}

function readMailerEnvConfig() {
  const host = process.env.SMTP_HOST?.trim() || "";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "Digital Hub";

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromName,
  };
}

function isSmtpUsable(config) {
  if (!config.host) return false;
  if (!Number.isFinite(config.port) || config.port <= 0) return false;
  if ((config.user && !config.pass) || (!config.user && config.pass)) return false;
  return true;
}

function getTransporter(config) {
  const signature = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
  });

  if (cachedTransporter && cachedConfigSignature === signature) {
    return cachedTransporter;
  }

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
  cachedConfigSignature = signature;
  return cachedTransporter;
}

async function getSiteSettingsSenderEmail() {
  const now = Date.now();
  if (now < cachedSiteSenderExpiresAt) {
    return cachedSiteSender;
  }

  try {
    const result = await pool.query(
      `
        SELECT contact_info
        FROM site_settings
        WHERE id = 1
        LIMIT 1
      `,
    );

    const contactInfo = result.rows[0]?.contact_info;
    const emailValue =
      contactInfo && typeof contactInfo === "object" && typeof contactInfo.email === "string"
        ? contactInfo.email.trim()
        : "";

    cachedSiteSender = emailValue || null;
  } catch {
    cachedSiteSender = null;
  } finally {
    cachedSiteSenderExpiresAt = now + 60_000;
  }

  return cachedSiteSender;
}

async function resolveFromAddress(config) {
  const siteSender = await getSiteSettingsSenderEmail();
  if (siteSender) return siteSender;
  return (
    process.env.DIGITAL_HUB_EMAIL?.trim() ||
    process.env.MAIL_FROM_ADDRESS?.trim() ||
    config.user ||
    ""
  );
}

export async function sendDigitalHubEmail({ to, subject, body }) {
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
  if (!fromAddress) {
    throw new AppError(
      500,
      "EMAIL_NOT_CONFIGURED",
      "Digital Hub sender email is not configured in site settings or env.",
    );
  }

  if (!isSmtpUsable(config)) {
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
