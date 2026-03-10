// File: server/src/tests/admin-workflows.e2e.ts
// Purpose: Exercises end-to-end backend behavior for admin workflows e2e.
// It verifies important server workflows with test requests and assertions.

import assert from "node:assert/strict";

type JsonEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type LoginPayload = {
  token: string;
  expiresIn: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    admin_role: string;
  };
};

type CohortRow = {
  id: number;
  status: string;
  allow_applications?: boolean;
  program_title?: string | null;
  name?: string | null;
};

type ApplicationRow = {
  id: number;
  status: string;
  stage?: string | null;
  full_name?: string | null;
  email?: string | null;
  created_user_id?: number | null;
};

type ApplicationMessage = {
  id: number;
  status: "draft" | "sent" | "failed";
  channel: "email" | "sms";
  to_value: string;
};

const BASE_URL = (process.env.E2E_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";

async function requestJson<T>(path: string, init?: RequestInit): Promise<JsonEnvelope<T>> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();

  let payload: JsonEnvelope<T> | null = null;
  try {
    payload = JSON.parse(text) as JsonEnvelope<T>;
  } catch {
    throw new Error(`Expected JSON from ${path}, received: ${text.slice(0, 200)}`);
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.error?.message || payload?.message || `Request failed with status ${response.status}`;
    throw new Error(`${init?.method || "GET"} ${path}: ${message}`);
  }

  return payload;
}

function unwrapData<T>(payload: JsonEnvelope<T>): T {
  if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data as T;
  }
  return payload as unknown as T;
}

// Handles 'loginAdmin' workflow for this module.
async function loginAdmin(): Promise<string> {
  assert(ADMIN_EMAIL, "Missing E2E_ADMIN_EMAIL (or ADMIN_EMAIL) environment variable.");
  assert(ADMIN_PASSWORD, "Missing E2E_ADMIN_PASSWORD (or ADMIN_PASSWORD) environment variable.");

  const login = await requestJson<LoginPayload>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  const token = unwrapData(login).token;
  assert(token, "Login succeeded but no token was returned.");
  return token;
}

// Handles 'authHeaders' workflow for this module.
function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Handles 'findOpenCohortId' workflow for this module.
async function findOpenCohortId(): Promise<number> {
  const response = await requestJson<CohortRow[]>("/public/cohorts?page=1&limit=200&sortBy=start_date&order=asc");
  const cohorts = unwrapData(response);
  const openCohort = cohorts.find((cohort) => cohort.status === "open" && cohort.allow_applications !== false);
  assert(openCohort, "No open cohort with applications enabled was found.");
  return openCohort.id;
}

// Handles 'main' workflow for this module.
async function main() {
  console.log(`[e2e] base url: ${BASE_URL}`);
  const token = await loginAdmin();
  console.log("[e2e] admin login: ok");

  const cohortId = await findOpenCohortId();
  const stamp = Date.now();
  const applicantEmail = `e2e+${stamp}@example.com`;
  const applicantName = `E2E Applicant ${stamp}`;

  await requestJson("/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cohort_id: cohortId,
      applicant: {
        full_name: applicantName,
        email: applicantEmail,
      },
      answers: {
        motivation: "Automated workflow verification",
      },
    }),
  });
  console.log("[e2e] application created");

  const listResponse = await requestJson<ApplicationRow[]>(
    `/applications?page=1&limit=25&search=${encodeURIComponent(applicantEmail)}`,
    { headers: authHeaders(token) },
  );
  const rows = unwrapData(listResponse);
  const created = rows.find((row) => (row.email || "").toLowerCase() === applicantEmail.toLowerCase());
  assert(created, "Created application could not be loaded from admin applications list.");
  const applicationId = created.id;

  await requestJson(`/applications/${applicationId}/stage`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({
      stage: "reviewing",
      message: "E2E: moved to reviewing.",
    }),
  });

  await requestJson(`/applications/${applicationId}/interview/schedule`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      duration_minutes: 30,
      location_type: "online",
      location_details: "E2E Meet",
      send_email: false,
      send_phone: false,
    }),
  });
  console.log("[e2e] interview scheduled");

  await requestJson(`/applications/${applicationId}/interview/mark-completed`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });

  await requestJson(`/applications/${applicationId}/decision`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      decision: "accepted",
      send_email: false,
      send_phone: false,
    }),
  });

  await requestJson(`/applications/${applicationId}/participation/confirm`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  console.log("[e2e] stage transitions completed");

  const draftMessageEnvelope = await requestJson<ApplicationMessage>(`/applications/${applicationId}/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      channel: "email",
      to_value: applicantEmail,
      subject: "E2E Draft",
      body: "E2E message delivery status check",
    }),
  });
  const draftMessage = unwrapData(draftMessageEnvelope);
  assert.equal(draftMessage.status, "draft", "Newly created application message should start in draft state.");

  const sendEnvelope = await requestJson<ApplicationMessage>(
    `/applications/${applicationId}/messages/${draftMessage.id}/send`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({}),
    },
  );
  const sentMessage = unwrapData(sendEnvelope);
  assert(
    sentMessage.status === "sent" || sentMessage.status === "failed",
    `Unexpected message delivery status: ${sentMessage.status}`,
  );
  console.log(`[e2e] message delivery status: ${sentMessage.status}`);

  const messageListEnvelope = await requestJson<
    | ApplicationMessage[]
    | {
        application_id: number;
        messages: ApplicationMessage[];
      }
  >(`/applications/${applicationId}/messages`, {
    headers: authHeaders(token),
  });
  const messageListData = unwrapData(messageListEnvelope);
  const messages = Array.isArray(messageListData) ? messageListData : messageListData.messages;
  const latestMessage = messages.find((message) => message.id === draftMessage.id);
  assert(latestMessage, "Message list did not include the message created by this test.");
  assert(
    latestMessage.status === "sent" || latestMessage.status === "failed",
    "Message status should be sent or failed after send endpoint call.",
  );

  const createUserEnvelope = await requestJson<Record<string, unknown>>(
    `/applications/${applicationId}/create-user`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        channels: {
          email: false,
          sms: false,
        },
      }),
    },
  );
  const createUserData = unwrapData(createUserEnvelope);
  const userId = Number(createUserData.student_user_id || 0);
  assert(Number.isFinite(userId) && userId > 0, "Create-user workflow did not return a valid student_user_id.");

  const onboardingMessage = createUserData.onboarding_message as
    | {
        sentMessages?: unknown[];
        failedMessages?: unknown[];
        skipped?: boolean;
      }
    | undefined;
  assert(onboardingMessage, "Create-user workflow missing onboarding_message payload.");
  assert(Array.isArray(onboardingMessage.sentMessages), "onboarding_message.sentMessages should be an array.");
  assert(Array.isArray(onboardingMessage.failedMessages), "onboarding_message.failedMessages should be an array.");
  assert(typeof onboardingMessage.skipped === "boolean", "onboarding_message.skipped should be boolean.");
  console.log("[e2e] create-user workflow: ok");

  const pipelineEnvelope = await requestJson<{
    application: {
      status?: string | null;
      stage?: string | null;
      created_user_id?: number | null;
    };
  }>(`/applications/${applicationId}/pipeline`, { headers: authHeaders(token) });
  const pipeline = unwrapData(pipelineEnvelope);
  const finalStatus = String(pipeline.application.status || pipeline.application.stage || "");
  assert.equal(finalStatus, "participation_confirmed", "Final application stage should be participation_confirmed.");

  console.log("[e2e] admin workflows completed successfully");
}

main().catch((error) => {
  console.error("[e2e] admin workflows failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

