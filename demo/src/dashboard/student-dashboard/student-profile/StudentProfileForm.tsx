"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/common/Link";

import PersonalInfoSection from "./components/PersonalInfoSection";
import ContactInfoSection from "./components/ContactInfoSection";
import SocialLinksSection from "./components/SocialLinksSection";
import ExperienceSection from "./components/ExperienceSection";
import EducationSection from "./components/EducationSection";
import SkillsSection from "./components/SkillsSection";
import CVUploadSection from "./components/CVUploadSection";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

type Profile = {
  fullName: string;
  email: string;
  phone?: string | null;

  headline?: string | null;
  about?: string | null;
  country?: string | null;
  city?: string | null;

  educationLevel?: string | null;
  educationField?: string | null;
  university?: string | null;
  graduationYear?: number | null;

  // legacy
  skills: string[];

  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;

  profileCompleted: boolean;
};

type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "HIGH";
type SkillItem = { id: number; name: string; level: SkillLevel };

type Experience = {
  id: number;
  title: string;
  company: string;
  country?: string | null;
  city?: string | null;
  isCurrent: boolean;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
};

type Education = {
  id: number;
  degree: string;
  fieldOfStudy?: string | null;
  institution: string;
  country?: string | null;
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
};

type CvAttachment = {
  id: number;
  profileId: number;
  fileName?: string | null;
  url?: string | null;
};

export default function StudentProfileForm({
  setupMode,
}: {
  setupMode: boolean;
}) {
  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [cv, setCv] = useState<CvAttachment | null>(null);

  const onMessage = ({
    error,
    success,
  }: {
    error?: string | null;
    success?: string | null;
  }) => {
    if (typeof error !== "undefined") setError(error);
    if (typeof success !== "undefined") setSuccess(success);
  };

  const loadProfile = async () => {
    const res = await fetch(`${API_BASE_URL}/students/me/profile`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to load profile");

    setProfile({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone ?? "",

      headline: data.headline ?? "",
      about: data.about ?? "",
      country: data.country ?? "",
      city: data.city ?? "",

      educationLevel: data.educationLevel ?? "",
      educationField: data.educationField ?? "",
      university: data.university ?? "",
      graduationYear: data.graduationYear ?? null,

      skills: Array.isArray(data.skills) ? data.skills : [],

      // UI uses "" for empty input, backend will receive null when saving (see saveProfilePatch)
      linkedinUrl: data.linkedinUrl ?? "",
      githubUrl: data.githubUrl ?? "",
      portfolioUrl: data.portfolioUrl ?? "",

      profileCompleted: !!data.profileCompleted,
    });
  };

  const loadSkills = async () => {
    const res = await fetch(`${API_BASE_URL}/students/me/skills`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json().catch(() => ([]));
    if (!res.ok)
      throw new Error((data as any)?.message || "Failed to load skills");
    setSkills(Array.isArray(data) ? data : []);
  };

  const loadExperiences = async () => {
    const res = await fetch(`${API_BASE_URL}/students/me/experiences`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json().catch(() => ([]));
    if (!res.ok)
      throw new Error((data as any)?.message || "Failed to load experiences");
    setExperiences(Array.isArray(data) ? data : []);
  };

  const loadEducations = async () => {
    const res = await fetch(`${API_BASE_URL}/students/me/educations`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json().catch(() => ([]));
    if (!res.ok)
      throw new Error((data as any)?.message || "Failed to load educations");
    setEducations(Array.isArray(data) ? data : []);
  };

  const loadCv = async () => {
    const res = await fetch(`${API_BASE_URL}/students/me/cv`, {
      method: "GET",
      credentials: "include",
    });

    if (res.status === 404) {
      setCv(null);
      return;
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data as any)?.message || "Failed to load CV");

    setCv(data && typeof data === "object" ? (data as CvAttachment) : null);
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await Promise.all([
        loadProfile(),
        loadSkills(),
        loadExperiences(),
        loadEducations(),
        loadCv(),
      ]);
    } catch (e: any) {
      setError(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateProfile = (key: keyof Profile, value: any) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  };

  const setupValidation = useMemo(() => {
    if (!setupMode) return null;
    if (!profile) return "Profile not loaded";

    if (!profile.headline?.trim()) return "Headline is required";
    if (!profile.country?.trim()) return "Country is required";
    if (!profile.city?.trim()) return "City is required";
    if (!profile.educationLevel?.trim()) return "Education level is required";
    if (!profile.educationField?.trim()) return "Education field is required";

    const hasAnySkill = skills.length > 0 || (profile.skills?.length ?? 0) > 0;
    if (!hasAnySkill) return "Add at least 1 skill";

    return null;
  }, [setupMode, profile, skills]);

  // ✅ helper: empty string -> null, trim -> value
  const normalizeOptionalUrl = (v: string | null | undefined) => {
    const trimmed = (v ?? "").trim();
    return trimmed ? trimmed : null;
  };

  const saveProfilePatch = async () => {
    if (!profile) return;

    onMessage({ error: null, success: null });

    if (setupMode && setupValidation) {
      onMessage({ error: setupValidation });
      return;
    }

    try {
      setSavingProfile(true);

      const res = await fetch(`${API_BASE_URL}/students/me/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: profile.phone,

          headline: profile.headline,
          about: profile.about,
          country: profile.country,
          city: profile.city,

          educationLevel: profile.educationLevel,
          educationField: profile.educationField,
          university: profile.university,
          graduationYear: profile.graduationYear
            ? Number(profile.graduationYear)
            : null,

          // ✅ IMPORTANT: make social links truly optional in DB
          linkedinUrl: normalizeOptionalUrl(profile.linkedinUrl),
          githubUrl: normalizeOptionalUrl(profile.githubUrl),
          portfolioUrl: normalizeOptionalUrl(profile.portfolioUrl),

          // keep legacy skills
          skills: profile.skills,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save");

      onMessage({ success: "Saved successfully ✅" });
      await loadProfile();

      if (setupMode) window.location.href = "/student-dashboard";
    } catch (e: any) {
      onMessage({ error: e?.message || "Failed to save" });
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading || !profile) return null;

  return (
    <>
      {setupMode ? (
        <div className="alert alert-warning mb-4">
          Please complete your profile to access the dashboard.
        </div>
      ) : null}

      {error ? <div className="alert alert-danger mb-3">{error}</div> : null}
      {success ? (
        <div className="alert alert-success mb-3">{success}</div>
      ) : null}

      <PersonalInfoSection
        profile={{
          fullName: profile.fullName,
          email: profile.email,
          headline: profile.headline,
          about: profile.about,
        }}
        onChange={updateProfile as any}
        onSave={saveProfilePatch}
        saving={savingProfile}
      />

      <ContactInfoSection
        profile={{
          phone: profile.phone,
          country: profile.country,
          city: profile.city,
        }}
        onChange={updateProfile as any}
        onSave={saveProfilePatch}
        saving={savingProfile}
      />

      <EducationSection
        items={educations}
        onReload={loadEducations}
        onMessage={onMessage}
      />

      <ExperienceSection
        items={experiences}
        onReload={loadExperiences}
        onMessage={onMessage}
      />

      <SkillsSection
        items={skills}
        onReload={async () => {
          await loadSkills();
          await loadProfile(); // refresh completion
        }}
        onMessage={onMessage}
      />

      <SocialLinksSection
        profile={{
          linkedinUrl: profile.linkedinUrl,
          githubUrl: profile.githubUrl,
          portfolioUrl: profile.portfolioUrl,
        }}
        onChange={updateProfile as any}
        onSave={saveProfilePatch}
        saving={savingProfile}
      />

      <CVUploadSection cv={cv} onReload={loadCv} onMessage={onMessage} />

      {!setupMode ? (
        <div className="d-flex gap-2 mt-2">
          <Link to="/student-dashboard" className="btn btn-border">
            Back to Dashboard
          </Link>
        </div>
      ) : null}
    </>
  );
}


