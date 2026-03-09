// File: frontend/src/dashboard/app/RequireSuperAdmin.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUser, isSuperAdminUser } from "../utils/auth";

type RequireSuperAdminProps = {
  children: ReactNode;
};

export function RequireSuperAdmin({ children }: RequireSuperAdminProps) {
  const location = useLocation();
  const user = getUser();

  if (!isSuperAdminUser(user)) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
