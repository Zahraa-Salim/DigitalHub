import { clearAuth, getToken } from "./auth";

const FALLBACK_API_URL = "http://localhost:5000";

export const API_URL = (import.meta.env.VITE_API_URL || FALLBACK_API_URL).replace(/\/$/, "");

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
};

type ApiFailureEnvelope = {
  success: false;
  error: ApiErrorPayload;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFailureEnvelope(value: unknown): ApiFailureEnvelope | null {
  if (!isObject(value) || value.success !== false || !isObject(value.error)) {
    return null;
  }

  const code = typeof value.error.code === "string" ? value.error.code : "UNKNOWN_ERROR";
  const message = typeof value.error.message === "string" ? value.error.message : "Request failed.";

  return {
    success: false,
    error: {
      code,
      message,
      details: value.error.details,
    },
  };
}

function toSuccessEnvelope<T>(value: unknown): ApiSuccessEnvelope<T> | null {
  if (!isObject(value) || value.success !== true || !("data" in value)) {
    return null;
  }

  const maybePagination = isObject(value.pagination)
    ? {
        page: Number(value.pagination.page ?? 1),
        limit: Number(value.pagination.limit ?? 10),
        total: Number(value.pagination.total ?? 0),
        totalPages: Number(value.pagination.totalPages ?? 0),
      }
    : undefined;

  return {
    success: true,
    data: value.data as T,
    message: typeof value.message === "string" ? value.message : undefined,
    pagination: maybePagination,
  };
}

async function parseBody(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { success: false, error: { code: "INVALID_JSON", message: raw } };
  }
}

async function request<T>(path: string, options: RequestInit = {}, requireAuth = true): Promise<ApiSuccessEnvelope<T>> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (requireAuth) {
    const token = getToken();
    if (!token) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required.");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const parsed = await parseBody(response);
  const failure = toFailureEnvelope(parsed);
  const success = toSuccessEnvelope<T>(parsed);

  if (!response.ok || failure) {
    const code = failure?.error.code || (response.status === 401 ? "UNAUTHORIZED" : "REQUEST_FAILED");
    const message = failure?.error.message || response.statusText || "Request failed.";
    const details = failure?.error.details;

    if (response.status === 401) {
      clearAuth();
    }

    throw new ApiError(response.status, code, message, details);
  }

  if (!success) {
    throw new ApiError(response.status, "INVALID_RESPONSE", "Invalid response format from server.");
  }

  return success;
}

export async function api<T>(path: string, options: RequestInit = {}, requireAuth = true): Promise<T> {
  const envelope = await request<T>(path, options, requireAuth);
  return envelope.data;
}

export async function apiList<T>(path: string, options: RequestInit = {}, requireAuth = true): Promise<{ data: T[]; pagination: PaginationMeta }> {
  const envelope = await request<T[]>(path, options, requireAuth);

  return {
    data: envelope.data,
    pagination: envelope.pagination ?? { page: 1, limit: envelope.data.length, total: envelope.data.length, totalPages: 1 },
  };
}
