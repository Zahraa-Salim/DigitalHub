export type StudentCohort = {
  enrollment_id: number;
  cohort_id: number | null;
  cohort_name: string | null;
  cohort_status: string | null;
  program_id: number | null;
  program_title: string | null;
  enrollment_status: string | null;
  enrolled_at: string | null;
};

export type StudentRow = {
  user_id: number;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  is_public: boolean;
  featured: boolean;
  featured_rank: number | null;
  public_slug: string | null;
  is_graduated: boolean;
  is_working: boolean;
  open_to_work: boolean;
  company_work_for: string | null;
  admin_status: "active" | "dropout" | null;
  dropout_reason: string | null;
  status_updated_at: string | null;
  status_updated_by: number | null;
  created_at: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  cohorts: StudentCohort[] | null;
};

export type CohortOption = {
  id: number;
  name: string;
};

export type StudentStatus = "active" | "dropout";

export function getStudentStatus(row: Pick<StudentRow, "admin_status" | "is_active">): StudentStatus {
  const status = String(row.admin_status || "").trim().toLowerCase();
  if (status === "dropout") return "dropout";
  if (status === "active") return "active";
  return row.is_active ? "active" : "dropout";
}

export function summarizeCohorts(cohorts: StudentCohort[] | null | undefined): string {
  if (!Array.isArray(cohorts) || cohorts.length === 0) {
    return "No cohort assigned";
  }
  const labels = cohorts
    .map((entry) => {
      const program = String(entry.program_title || "").trim();
      const cohort = String(entry.cohort_name || "").trim();
      if (program && cohort) return `${program} - ${cohort}`;
      if (cohort) return cohort;
      if (program) return program;
      return "Assigned cohort";
    })
    .filter((value) => value.length > 0);
  if (!labels.length) return "No cohort assigned";
  if (labels.length <= 2) return labels.join(" | ");
  return `${labels.slice(0, 2).join(" | ")} +${labels.length - 2} more`;
}
