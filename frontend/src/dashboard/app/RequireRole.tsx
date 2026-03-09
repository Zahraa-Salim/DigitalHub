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
