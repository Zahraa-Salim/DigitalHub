// File Summary: server/src/utils/whatsapp.ts
// Layer: utils
// Purpose: Sends WhatsApp messages through provider configuration with a mock fallback.
// Notes: This file is part of the Digital Hub Express + TypeScript backend.
// @ts-nocheck
import { AppError } from "./appError.js";

let warnedMockMode = false;

function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Keep leading plus if present, remove other non-digits.
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return `${hasPlus ? "+" : ""}${digits}`;
}

function readConfig() {
  const provider = (process.env.WHATSAPP_PROVIDER || "twilio").trim().toLowerCase();
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim() || "";

  const from = fromRaw
    ? fromRaw.startsWith("whatsapp:")
      ? fromRaw
      : `whatsapp:${fromRaw}`
    : "";

  return {
    provider,
    accountSid,
    authToken,
    from,
  };
}

function isConfigured(config) {
  if (config.provider !== "twilio") return false;
  return Boolean(config.accountSid && config.authToken && config.from);
}

export async function sendDigitalHubWhatsApp({ to, body }) {
  const destinationPhone = normalizePhone(to);
  const messageBody = String(body || "").trim();

  if (!destinationPhone) {
    throw new AppError(400, "VALIDATION_ERROR", "WhatsApp destination phone is required.");
  }
  if (!messageBody) {
    throw new AppError(400, "VALIDATION_ERROR", "WhatsApp message body is required.");
  }

  const config = readConfig();
  const destination = `whatsapp:${destinationPhone}`;

  if (!isConfigured(config)) {
    if (!warnedMockMode) {
      warnedMockMode = true;
      console.warn("[whatsapp] Provider is not fully configured. WhatsApp sends are running in mock mode.");
    }
    return {
      mode: "mock",
      provider: config.provider,
      from: config.from || null,
      to: destination,
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`;
  const authHeader = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;
  const payload = new URLSearchParams();
  payload.set("From", config.from);
  payload.set("To", destination);
  payload.set("Body", messageBody);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch {
      details = "";
    }
    throw new AppError(
      502,
      "WHATSAPP_SEND_FAILED",
      `WhatsApp provider failed with status ${response.status}.${details ? ` ${details}` : ""}`,
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    mode: "twilio",
    provider: "twilio",
    from: config.from,
    to: destination,
    sid: data?.sid ?? null,
    status: data?.status ?? null,
  };
}
