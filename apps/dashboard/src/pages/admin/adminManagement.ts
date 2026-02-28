export type AdminRecord = {
  id: number;
  email: string | null;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
  full_name: string;
  admin_role: "admin" | "super_admin";
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
};

export function formatAdminRole(role: "admin" | "super_admin"): string {
  return role === "super_admin" ? "Super Admin" : "Admin";
}
