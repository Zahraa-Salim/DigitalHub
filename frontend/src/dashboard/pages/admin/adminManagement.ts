// File: frontend/src/dashboard/pages/admin/adminManagement.ts
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
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
