// File: frontend/src/dashboard/app/RequireAdmin.tsx
// Purpose: Defines dashboard app behavior for require admin.
// It wires route guards, layouts, and route configuration for the admin experience.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";

export function RequireAdmin() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

