import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUser } from "../utils/auth";

type RequireSuperAdminProps = {
  children: ReactNode;
};

export function RequireSuperAdmin({ children }: RequireSuperAdminProps) {
  const location = useLocation();
  const user = getUser();
  const role = user.role.trim().toLowerCase();

  if (role !== "super admin") {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
