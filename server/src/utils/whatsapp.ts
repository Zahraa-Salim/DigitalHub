// File: server/src/utils/whatsapp.ts
// Purpose: Provides shared helper logic for whatsapp.
// It supports other backend modules with reusable utility functions.


import { AppError } from "./appError.js";

let warnedMockMode = false;

type WhatsAppConfig = {
  provider: string;
  accountSid: string;
  authToken: string;
  from: string;
  metaToken: string;
  metaPhoneNumberId: string;
};

type SendWhatsAppInput = {
  to: string;
  body: string;
};

// Handles 'normalizePhone' workflow for this module.
function normalizePhone(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Keep leading plus if present, remove other non-digits.
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return `${hasPlus ? "+" : ""}${digits}`;
}

// Handles 'readConfig' workflow for this module.
function readConfig(): WhatsAppConfig {
  const provider = (process.env.WHATSAPP_PROVIDER || "twilio").trim().toLowerCase();
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim() || "";
  const metaToken = process.env.META_WA_TOKEN?.trim() || "";
  const metaPhoneNumberId = process.env.META_PHONE_NUMBER_ID?.trim() || "";

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
    metaToken,
    metaPhoneNumberId,
  };
}

// Handles 'isConfigured' workflow for this module.
function isConfigured(config: WhatsAppConfig): boolean {
  if (config.provider === "twilio") {
    return Boolean(config.accountSid && config.authToken && config.from);
  }
  if (config.provider === "meta") {
    return Boolean(config.metaToken && config.metaPhoneNumberId);
  }
  return false;
}

// Handles 'sendDigitalHubWhatsApp' workflow for this module.
export async function sendDigitalHubWhatsApp({ to, body }: SendWhatsAppInput) {
  const destinationPhone = normalizePhone(to);
  const messageBody = String(body || "").trim();

  if (!destinationPhone) {
    throw new AppError(400, "VALIDATION_ERROR", "WhatsApp destination phone is required.", undefined);
  }
  if (!messageBody) {
    throw new AppError(400, "VALIDATION_ERROR", "WhatsApp message body is required.", undefined);
  }

  const config = readConfig();
  const metaDestination = destinationPhone.replace(/\D/g, "");
  const destination = config.provider === "meta" ? metaDestination : `whatsapp:${destinationPhone}`;

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

  if (config.provider === "meta") {
    if (!metaDestination) {
      throw new AppError(400, "VALIDATION_ERROR", "WhatsApp destination phone is required.", undefined);
    }

    const url = `https://graph.facebook.com/v22.0/${encodeURIComponent(config.metaPhoneNumberId)}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: metaDestination,
      type: "text",
      text: { body: messageBody },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.metaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
        undefined,
      );
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      mode: "meta",
      provider: "meta",
      from: null,
      to: metaDestination,
      message_id: data?.messages?.[0]?.id ?? null,
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
      undefined,
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

