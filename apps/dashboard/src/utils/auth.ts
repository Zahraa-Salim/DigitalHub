const TOKEN_KEY = "dh_admin_token";
const USER_KEY = "dh_admin_user";

export type AdminRole = "admin" | "super_admin";

export type AuthUser = {
  id: number | string | null;
  email: string;
  full_name: string;
  admin_role: AdminRole;
  role: string;
  job_title: string;
  role_label: string;
};

const defaultUser: AuthUser = {
  id: null,
  email: "",
  full_name: "Admin",
  admin_role: "admin",
  role: "admin",
  job_title: "",
  role_label: "Admin",
};

function toRoleLabel(role: AdminRole): string {
  return role === "super_admin" ? "Super Admin" : "Admin";
}

function normalizeRole(input: unknown): AdminRole {
  const normalized = String(input || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "super_admin") {
    return "super_admin";
  }
  return "admin";
}

function isSuperAdminJobTitle(input: unknown): boolean {
  const value = String(input || "").trim().toLowerCase();
  return value.includes("super admin");
}

function normalizeUser(input: unknown): AuthUser {
  if (!input || typeof input !== "object") {
    return defaultUser;
  }

  const obj = input as Record<string, unknown>;
  const fullName = typeof obj.full_name === "string" && obj.full_name.trim()
    ? obj.full_name.trim()
    : typeof obj.name === "string" && obj.name.trim()
      ? obj.name.trim()
      : "Admin";

  const roleSource =
    typeof obj.role === "string" && obj.role.trim()
      ? obj.role.trim()
      : typeof obj.admin_role === "string" && obj.admin_role.trim()
        ? obj.admin_role.trim()
        : "admin";
  const jobTitle = typeof obj.job_title === "string" ? obj.job_title.trim() : "";
  const adminRole = isSuperAdminJobTitle(jobTitle) ? "super_admin" : normalizeRole(roleSource);
  const roleLabel = toRoleLabel(adminRole);
  const email = typeof obj.email === "string" ? obj.email : "";
  const id = typeof obj.id === "number" || typeof obj.id === "string" ? obj.id : null;

  return {
    id,
    email,
    full_name: fullName,
    admin_role: adminRole,
    role: adminRole,
    job_title: jobTitle,
    role_label: roleLabel,
  };
}

export function isSuperAdminUser(user: Pick<AuthUser, "admin_role" | "role" | "job_title"> | null | undefined): boolean {
  if (!user) {
    return false;
  }

  const roleValue = String(user.admin_role || user.role || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (roleValue === "super_admin") {
    return true;
  }

  return isSuperAdminJobTitle(user.job_title);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): AuthUser {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return defaultUser;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeUser(parsed);
  } catch {
    return defaultUser;
  }
}

export function setUser(user: unknown): void {
  const normalized = normalizeUser(user);
  localStorage.setItem(USER_KEY, JSON.stringify(normalized));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function clearAuth(): void {
  clearToken();
  clearUser();
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
