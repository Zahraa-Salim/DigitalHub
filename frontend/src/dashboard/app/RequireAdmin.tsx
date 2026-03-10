// File: frontend/src/dashboard/app/RequireAdmin.tsx
// Purpose: Defines dashboard app behavior for require admin.
// It wires route guards, layouts, and route configuration for the admin experience.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../utils/auth";

export function RequireAdmin() {
  const location = useLocation();

  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

