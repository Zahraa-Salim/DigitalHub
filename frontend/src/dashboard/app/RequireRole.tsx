// File: frontend/src/dashboard/app/RequireRole.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { AdminRole } from "../utils/auth";
import { getUser } from "../utils/auth";

type RequireRoleProps = {
  allowedRoles: AdminRole[];
  children: ReactNode;
};

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const location = useLocation();
  const user = getUser();

  if (!allowedRoles.includes(user.admin_role)) {
    return <Navigate to="/admin/profile" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
