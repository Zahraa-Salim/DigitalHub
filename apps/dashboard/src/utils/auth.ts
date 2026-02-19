const TOKEN_KEY = "dh_admin_token";
const USER_KEY = "dh_admin_user";

export type AuthUser = {
  id: number | string | null;
  email: string;
  full_name: string;
  role: string;
};

const defaultUser: AuthUser = {
  id: null,
  email: "",
  full_name: "Admin",
  role: "Admin",
};

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

  const role = typeof obj.role === "string" && obj.role.trim() ? obj.role.trim() : "Admin";
  const email = typeof obj.email === "string" ? obj.email : "";
  const id = typeof obj.id === "number" || typeof obj.id === "string" ? obj.id : null;

  return {
    id,
    email,
    full_name: fullName,
    role,
  };
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
