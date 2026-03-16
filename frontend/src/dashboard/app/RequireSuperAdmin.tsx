// File: frontend/src/dashboard/app/RequireSuperAdmin.tsx
// Purpose: Defines dashboard app behavior for require super admin.
// It wires route guards, layouts, and route configuration for the admin experience.

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isSuperAdminUser } from "../utils/auth";
import { useAuthStore } from "../stores/useAuthStore";

type RequireSuperAdminProps = {
  children: ReactNode;
};

export function RequireSuperAdmin({ children }: RequireSuperAdminProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  if (!isSuperAdminUser(user)) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

