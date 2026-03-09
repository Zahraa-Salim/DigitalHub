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
