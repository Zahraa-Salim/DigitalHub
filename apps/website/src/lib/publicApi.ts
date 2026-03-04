export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type ListResponse<T> = {
  success?: boolean;
  data?: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type SuccessResponse<T> = {
  success?: boolean;
  data?: T;
};

export type PublicCohort = {
  id: number;
  program_id: number;
  program_title: string;
  program_image_url?: string | null;
  name: string;
  status: "coming_soon" | "open" | "running" | "completed" | "cancelled" | "planned";
  allow_applications: boolean;
  use_general_form?: boolean;
  application_form_id?: number | null;
  capacity?: number | null;
  enrollment_open_at?: string | null;
  enrollment_close_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PublicStudent = {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  featured?: boolean;
  featured_rank?: number | null;
  public_slug?: string | null;
  is_graduated?: boolean;
  is_working?: boolean;
  open_to_work?: boolean;
  company_work_for?: string | null;
  email?: string | null;
  phone?: string | null;
  cohort_name?: string | null;
  program_title?: string | null;
  cohorts?: Array<{
    cohort_name?: string | null;
    program_title?: string | null;
  }> | null;
  headline?: string | null;
  city?: string | null;
  country?: string | null;
  location?: string | null;
  skills?: string | null;
  experience_summary?: string | null;
  education?: string | null;
  certifications?: string | null;
  cv_url?: string | null;
  cv_file_name?: string | null;
  cv_updated_at?: string | null;
};

export type PublicStudentProject = {
  id: number;
  title: string;
  description?: string | null;
  image_url?: string | null;
  github_url?: string | null;
  live_url?: string | null;
};

export type PublicStudentDetail = PublicStudent & {
  projects: PublicStudentProject[];
};

export type PublicInstructor = {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  expertise?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
};

export type PublicAdmin = {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  job_title?: string | null;
  admin_role?: "admin" | "super_admin" | null;
  sort_order?: number;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
};

export type PublicFormField = {
  id: number;
  form_id: number;
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "phone" | "select" | "checkbox" | "date" | "file";
  required: boolean;
  options?: unknown;
  placeholder?: string | null;
  min_length?: number | null;
  max_length?: number | null;
  sort_order: number;
  is_enabled: boolean;
};

export type PublicResolvedForm = {
  id: number;
  key: string;
  title: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
  fields: PublicFormField[];
};

export type PublicCohortFormResolution = {
  cohort: {
    id: number;
    name: string;
    program_id: number;
    program_title: string;
    status: string;
    use_general_form: boolean;
    application_form_id: number | null;
    updated_at: string;
  };
  resolved_form: PublicResolvedForm;
  form_source: "general" | "custom";
};

export type PublicSiteSettings = {
  id: number;
  site_name: string | null;
  default_event_location: string | null;
  contact_info: Record<string, unknown> | null;
  social_links: Record<string, unknown> | null;
  updated_at: string;
};

export type PublicHomeData = {
  sections: Array<{
    id: number;
    key: string;
    title: string | null;
    is_enabled: boolean;
    sort_order: number;
    content: Record<string, unknown> | null;
    updated_at: string;
  }>;
  site_settings: PublicSiteSettings | null;
};

export type PublicEvent = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  post_body?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at?: string | null;
  is_done: boolean;
  done_at?: string | null;
  completion_image_urls?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

export type PublicProgramOption = {
  id: number;
  title: string;
  slug: string | null;
  summary?: string | null;
  description?: string | null;
  requirements?: string | null;
  image_url?: string | null;
  default_capacity?: number | null;
};

export type PublicApplyFormData = {
  form: {
    id: number;
    key: string;
    title: string | null;
    description: string | null;
    is_active: boolean;
    updated_at: string;
  };
  fields: PublicFormField[];
  programs: PublicProgramOption[];
};

type PublicApiError = Error & {
  status?: number;
  path?: string;
};

const buildPublicApiError = (path: string, status: number, message?: string): PublicApiError => {
  const error = new Error(message || `Failed to load ${path}`) as PublicApiError;
  error.status = status;
  error.path = path;
  return error;
};

const toQueryString = (params?: Record<string, string | number | boolean | undefined | null>) => {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const raw = search.toString();
  return raw ? `?${raw}` : "";
};

async function getList<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T[]> {
  const res = await fetch(`${API_BASE_URL}${path}${toQueryString(params)}`, {
    cache: "no-store",
    credentials: "omit",
  });

  if (!res.ok) {
    throw buildPublicApiError(path, res.status);
  }

  const json = (await res.json()) as ListResponse<T> | T[];
  if (Array.isArray(json)) return json;
  return Array.isArray(json.data) ? json.data : [];
}

async function getData<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    credentials: "omit",
  });

  if (!res.ok) {
    throw buildPublicApiError(path, res.status);
  }

  const json = (await res.json()) as SuccessResponse<T>;
  if (json && typeof json === "object" && "data" in json && json.data !== undefined) {
    return json.data;
  }
  throw new Error(`Invalid payload from ${path}`);
}

export async function listPublicCohorts(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
  search?: string;
}) {
  return getList<PublicCohort>("/public/cohorts", {
    page: params?.page ?? 1,
    limit: params?.limit ?? 200,
    sortBy: params?.sortBy ?? "start_date",
    order: params?.order ?? "asc",
    search: params?.search,
  });
}

export async function listOpenCohorts() {
  const cohorts = await listPublicCohorts({
    page: 1,
    limit: 200,
    sortBy: "start_date",
    order: "asc",
  });

  return cohorts.filter((cohort) => cohort.status === "open" && cohort.allow_applications);
}

export async function getPublicCohortFormResolution(cohortId: number) {
  return getData<PublicCohortFormResolution>(`/public/cohorts/${cohortId}/form`);
}

export async function listPublicStudents(params?: {
  page?: number;
  limit?: number;
  search?: string;
  featured?: boolean;
}) {
  return getList<PublicStudent>("/public/students", {
    page: params?.page ?? 1,
    limit: params?.limit ?? 200,
    search: params?.search,
    featured: params?.featured,
    sortBy: "featured_rank",
    order: "asc",
  });
}

export async function getPublicStudentBySlug(publicSlug: string) {
  const normalized = String(publicSlug || "").trim();
  if (!normalized) {
    throw new Error("Student slug is required.");
  }
  return getData<PublicStudentDetail>(`/public/students/${encodeURIComponent(normalized)}`);
}

export async function listPublicManagers() {
  return getList<PublicAdmin>("/public/managers", {
    page: 1,
    limit: 200,
    sortBy: "sort_order",
    order: "asc",
  });
}

export async function listPublicInstructors() {
  return getList<PublicInstructor>("/public/instructors", {
    page: 1,
    limit: 200,
    sortBy: "created_at",
    order: "asc",
  });
}

export async function getPublicHomeData() {
  return getData<PublicHomeData>("/public/home");
}

export async function listPublicPrograms() {
  return getList<PublicProgramOption>("/public/programs");
}

export async function listPublicEvents(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
  search?: string;
}) {
  return getList<PublicEvent>("/public/events", {
    page: params?.page ?? 1,
    limit: params?.limit ?? 200,
    sortBy: params?.sortBy ?? "starts_at",
    order: params?.order ?? "asc",
    search: params?.search,
  });
}

export async function getPublicEventBySlug(slug: string) {
  const normalized = String(slug || "").trim();
  if (!normalized) {
    throw new Error("Event slug is required.");
  }
  try {
    return await getData<PublicEvent>(`/public/events/${encodeURIComponent(normalized)}`);
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : null;
    if (status !== 404) {
      throw error;
    }
    // Backward compatibility: if backend slug route is missing, resolve from list endpoint.
    const rows = await listPublicEvents({
      page: 1,
      limit: 200,
      sortBy: "starts_at",
      order: "desc",
    });
    const match = rows.find((item) => String(item.slug || "").trim() === normalized);
    if (!match) {
      throw error;
    }
    return match;
  }
}

export async function getPublicApplyForm() {
  return getData<PublicApplyFormData>("/public/apply/form");
}

export async function submitPublicApply(payload: {
  program_id: number;
  answers: Record<string, unknown>;
}) {
  const res = await fetch(`${API_BASE_URL}/public/apply`, {
    method: "POST",
    cache: "no-store",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Unable to submit your application right now. Please try again.";
    try {
      const json = (await res.json()) as { error?: { message?: string } };
      if (json?.error?.message) {
        message = json.error.message;
      }
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const json = (await res.json()) as SuccessResponse<{ id: number; status: string }>;
  if (json?.data) return json.data;
  throw new Error("Invalid payload from /public/apply");
}
