"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "@/utils/navigation";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function StudentOnly({
  children,
  redirectTo = "/login",
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState<boolean>(false);

  const isStudent = !!user?.roles?.includes("STUDENT");
  const isProfilePage = pathname?.startsWith("/student-profile");

  useEffect(() => {
    if (loading) return;

    // Not logged in OR not student
    if (!user || !isStudent) {
      router.replace(redirectTo);
      return;
    }

    // If student, check profile completion (except on profile page)
    (async () => {
      try {
        setCheckingProfile(true);
        const res = await fetch(`${API_BASE_URL}/students/me/profile`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          // if backend fails, allow page to render but keep safe
          setProfileCompleted(true);
          return;
        }

        const data = await res.json();
        const completed = !!data?.profileCompleted;

        setProfileCompleted(completed);

        // Force setup only when NOT on profile page
        if (!completed && !isProfilePage) {
          router.replace("/student-profile?setup=1");
        }
      } finally {
        setCheckingProfile(false);
      }
    })();
  }, [user, loading, isStudent, isProfilePage, router, redirectTo]);

  if (loading || checkingProfile) return null;
  if (!user || !isStudent) return null;

  // If profile not completed and not on profile page, we already redirected
  return <>{children}</>;
}

