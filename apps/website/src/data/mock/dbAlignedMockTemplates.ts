// File: src/data/mock/dbAlignedMockTemplates.ts
// Purpose: Provides database-aligned mock data templates and mapping helpers for current website cards.
// If you change this file: Changing field mappings can alter filters/cards behavior if output no longer matches UI mock types.
export type ProgramCardMock = {
  id: number;
  title: string;
  shortDescription: string;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  level: string;
  durationLabel: string;
  createdAt: string;
  instructorName: string;
  thumb: string;
  rating: number;
};

export type PeopleMode = "participants" | "team";

export type PersonCardMock = {
  id: number;
  mode: PeopleMode;
  name: string;
  role: string;
  primaryTag: string;
  secondaryTag: string;
  status: string;
  bio: string;
  avatar: string;
  order: number;
};

export type DbProgramRow = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  requirements: string | null;
  default_capacity: number | null;
  created_at: string;
  updated_at: string;
};

export type DbCohortRow = {
  id: number;
  program_id: number;
  program_title: string;
  name: string;
  status: "planned" | "coming_soon" | "open" | "running" | "completed" | "cancelled";
  allow_applications: boolean;
  capacity: number | null;
  enrollment_open_at: string | null;
  enrollment_close_at: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type DbStudentRow = {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  featured: boolean;
  featured_rank: number | null;
  public_slug: string | null;
  is_graduated?: boolean;
  is_working?: boolean;
  open_to_work?: boolean;
  company_work_for?: string | null;
};

export type DbInstructorRow = {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  expertise: string | null;
};

export type DbAdminRow = {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  admin_role: "admin" | "super_admin";
  sort_order: number;
};

// Template representing `/public/programs` response rows.
export const dbProgramsTemplate: DbProgramRow[] = [
  {
    id: 1,
    slug: "full-stack",
    title: "Full Stack Development",
    summary: "Build modern web apps with React, Node, and PostgreSQL.",
    description: "Program description from DB.",
    requirements: "Basic computer skills and motivation to learn.",
    default_capacity: 20,
    created_at: "2026-01-01T08:00:00.000Z",
    updated_at: "2026-01-15T10:00:00.000Z",
  },
  {
    id: 2,
    slug: "ui-ux",
    title: "UI/UX Design",
    summary: "Learn design thinking and build real UI projects.",
    description: "User research, wireframing, prototyping, and design systems.",
    requirements: "Creativity and basic computer skills.",
    default_capacity: 15,
    created_at: "2026-01-02T08:00:00.000Z",
    updated_at: "2026-01-16T10:00:00.000Z",
  },
];

// Template representing `/public/cohorts` response rows.
export const dbCohortsTemplate: DbCohortRow[] = [
  {
    id: 101,
    program_id: 1,
    program_title: "Full Stack Development",
    name: "Full Stack - Spring 2026",
    status: "open",
    allow_applications: true,
    capacity: 20,
    enrollment_open_at: "2026-02-01T00:00:00.000Z",
    enrollment_close_at: "2026-03-01T00:00:00.000Z",
    start_date: "2026-03-10",
    end_date: "2026-06-10",
    created_at: "2026-01-10T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z",
  },
  {
    id: 102,
    program_id: 2,
    program_title: "UI/UX Design",
    name: "UI/UX - Coming Soon",
    status: "coming_soon",
    allow_applications: false,
    capacity: 15,
    enrollment_open_at: null,
    enrollment_close_at: null,
    start_date: "2026-05-01",
    end_date: "2026-07-01",
    created_at: "2026-01-11T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z",
  },
];

// Template representing `/public/students` response rows.
export const dbStudentsTemplate: DbStudentRow[] = [
  {
    user_id: 3001,
    full_name: "Zahraa Salim",
    avatar_url: null,
    bio: "Junior developer focused on building real projects.",
    featured: true,
    featured_rank: 1,
    public_slug: "zahraa-salim",
    is_graduated: true,
    is_working: false,
    open_to_work: true,
    company_work_for: null,
  },
];

// Template representing `/public/instructors` response rows.
export const dbInstructorsTemplate: DbInstructorRow[] = [
  {
    user_id: 2001,
    full_name: "Rami Haddad",
    avatar_url: null,
    bio: "Full-stack engineer and mentor focused on employability.",
    expertise: "React, Node.js, PostgreSQL, API Design",
  },
];

// Template representing `/public/managers` response rows.
export const dbAdminsTemplate: DbAdminRow[] = [
  {
    user_id: 1001,
    full_name: "Digital Hub Admin",
    avatar_url: null,
    bio: "Program manager supporting learners and partners.",
    job_title: "Program Manager",
    admin_role: "super_admin",
    sort_order: 1,
  },
];

type AvatarResolver = (seedId: number, dbAvatarUrl: string | null, fallback: string) => string;

const defaultAvatarResolver: AvatarResolver = (_seedId, dbAvatarUrl, fallback) =>
  dbAvatarUrl || fallback;

const levelFromCohortStatus: Record<DbCohortRow["status"], string> = {
  planned: "Beginner",
  coming_soon: "Beginner",
  open: "Intermediate",
  running: "Intermediate",
  completed: "High",
  cancelled: "Beginner",
};

const durationLabelFromDates = (startDate: string | null, endDate: string | null) => {
  if (!startDate || !endDate) return "8 Weeks";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const weeks = Math.max(1, Math.round(days / 7));
  return `${weeks} Weeks`;
};

// Produces the exact structure required by `CourseArea` and existing filters/sort UI.
export const mapDbProgramsToCourseMocks = (
  programs: DbProgramRow[],
  cohorts: DbCohortRow[],
  getAvatar: AvatarResolver = defaultAvatarResolver
): ProgramCardMock[] => {
  const byProgram = new Map<number, DbCohortRow[]>();
  cohorts.forEach((cohort) => {
    const list = byProgram.get(cohort.program_id) || [];
    list.push(cohort);
    byProgram.set(cohort.program_id, list);
  });

  return programs.map((program, idx) => {
    const cohort = (byProgram.get(program.id) || []).sort((a, b) =>
      (a.start_date || "").localeCompare(b.start_date || "")
    )[0];

    const categoryName = cohort?.status ? cohort.status.replace("_", " ") : "planned";
    const titleCaseCategory = categoryName
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return {
      id: program.id,
      title: program.title,
      shortDescription: program.summary || program.description || "Program overview.",
      category: {
        id: idx + 1,
        name: titleCaseCategory,
        slug: titleCaseCategory.toLowerCase().replace(/\s+/g, "-"),
      },
      level: cohort ? levelFromCohortStatus[cohort.status] : "Beginner",
      durationLabel: cohort
        ? durationLabelFromDates(cohort.start_date, cohort.end_date)
        : "8 Weeks",
      createdAt: cohort?.created_at || program.created_at,
      instructorName: "Digital Hub Team",
      thumb: getAvatar(program.id, null, "/assets/img/courses/course_thumb01.jpg"),
      rating: 5,
    };
  });
};

const participantStatus = (student: DbStudentRow) => {
  if (student.open_to_work) return "Open to Work";
  if (student.is_working) return "Working";
  if (student.is_graduated) return "Graduated";
  return "Training";
};

// Produces the exact structure required by `PeopleDirectory`.
export const mapDbProfilesToPeopleMocks = (
  students: DbStudentRow[],
  instructors: DbInstructorRow[],
  admins: DbAdminRow[],
  getAvatar: AvatarResolver = defaultAvatarResolver
): PersonCardMock[] => {
  const participantCards: PersonCardMock[] = students.map((student, index) => ({
    id: student.user_id,
    mode: "participants",
    name: student.full_name,
    role: student.is_graduated ? "Graduate" : "Participant",
    primaryTag: student.is_working ? "Job Placed" : "Career Track",
    secondaryTag: student.company_work_for || "Digital Hub Cohort",
    status: participantStatus(student),
    bio: student.bio || "Participant profile from database.",
    avatar: getAvatar(student.user_id, student.avatar_url, "/assets/img/instructor/instructor01.png"),
    order: student.featured_rank || index + 1,
  }));

  const instructorCards: PersonCardMock[] = instructors.map((instructor, index) => ({
    id: instructor.user_id,
    mode: "team",
    name: instructor.full_name,
    role: "Instructor",
    primaryTag: instructor.expertise || "Instruction",
    secondaryTag: "Learning Team",
    status: "Available",
    bio: instructor.bio || "Instructor profile from database.",
    avatar: getAvatar(instructor.user_id, instructor.avatar_url, "/assets/img/instructor/instructor07.png"),
    order: index + 1,
  }));

  const adminCards: PersonCardMock[] = admins.map((admin, index) => ({
    id: admin.user_id,
    mode: "team",
    name: admin.full_name,
    role: admin.job_title || "Program Team",
    primaryTag: admin.admin_role === "super_admin" ? "Leadership" : "Operations",
    secondaryTag: "Digital Hub",
    status: "Available",
    bio: admin.bio || "Admin profile from database.",
    avatar: getAvatar(admin.user_id, admin.avatar_url, "/assets/img/instructor/instructor08.png"),
    order: 100 + admin.sort_order + index,
  }));

  return [...participantCards, ...adminCards, ...instructorCards];
};
