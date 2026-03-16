// File: frontend/src/dashboard/app/RequireRole.tsx
// Purpose: Defines dashboard app behavior for require role.
// It wires route guards, layouts, and route configuration for the admin experience.

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { AdminRole } from "../utils/auth";
import { useAuthStore } from "../stores/useAuthStore";

type RequireRoleProps = {
  allowedRoles: AdminRole[];
  children: ReactNode;
};

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const adminRole = user?.admin_role ?? "admin";

  if (!allowedRoles.includes(adminRole)) {
    return <Navigate to="/admin/profile" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

