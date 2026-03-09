import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../utils/auth";

export function RequireAdmin() {
  const location = useLocation();

  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
