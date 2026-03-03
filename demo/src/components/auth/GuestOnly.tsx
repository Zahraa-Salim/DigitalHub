"use client";

import { useEffect } from "react";
import { useRouter } from "@/utils/navigation";
import { useAuth } from "@/context/AuthContext";

export default function GuestOnly({
  children,
  redirectTo = "/student-dashboard",
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If logged in (student) -> block guest pages
    if (user?.roles?.includes("STUDENT")) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  if (loading) return null;

  // While redirecting, render nothing
  if (user?.roles?.includes("STUDENT")) return null;

  return <>{children}</>;
}

