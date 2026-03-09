export type ApplicationStage =
  | "Applied"
  | "Reviewing"
  | "Interview"
  | "Confirmed"
  | "Accepted"
  | "Rejected";

export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  program: string;
  appliedDate: string;
  stage: ApplicationStage;
  gpa?: string;
  location: string;
}

export const applicants: Applicant[] = [
  {
    id: "1",
    name: "Sophia Chen",
    email: "sophia.chen@email.com",
    phone: "+1 415 555 0101",
    program: "Computer Science",
    appliedDate: "2026-01-15",
    stage: "Accepted",
    gpa: "3.9",
    location: "San Francisco, CA",
  },
  {
    id: "2",
    name: "Marcus Williams",
    email: "marcus.w@email.com",
    phone: "+1 312 555 0102",
    program: "Business Administration",
    appliedDate: "2026-01-18",
    stage: "Interview",
    gpa: "3.7",
    location: "Chicago, IL",
  },
  {
    id: "3",
    name: "Aisha Patel",
    email: "aisha.patel@email.com",
    phone: "+1 212 555 0103",
    program: "Data Science",
    appliedDate: "2026-01-20",
    stage: "Reviewing",
    gpa: "3.8",
    location: "New York, NY",
  },
  {
    id: "4",
    name: "James O'Brien",
    email: "james.obrien@email.com",
    phone: "+1 617 555 0104",
    program: "Mechanical Engineering",
    appliedDate: "2026-01-22",
    stage: "Applied",
    gpa: "3.5",
    location: "Boston, MA",
  },
  {
    id: "5",
    name: "Priya Sharma",
    email: "priya.sharma@email.com",
    phone: "+1 512 555 0105",
    program: "Computer Science",
    appliedDate: "2026-01-23",
    stage: "Confirmed",
    gpa: "4.0",
    location: "Austin, TX",
  },
  {
    id: "6",
    name: "Ethan Nakamura",
    email: "ethan.n@email.com",
    phone: "+1 206 555 0106",
    program: "Finance",
    appliedDate: "2026-01-25",
    stage: "Rejected",
    gpa: "3.1",
    location: "Seattle, WA",
  },
  {
    id: "7",
    name: "Layla Hassan",
    email: "layla.hassan@email.com",
    phone: "+1 305 555 0107",
    program: "Psychology",
    appliedDate: "2026-01-26",
    stage: "Interview",
    gpa: "3.6",
    location: "Miami, FL",
  },
  {
    id: "8",
    name: "Noah Thompson",
    email: "noah.t@email.com",
    phone: "+1 720 555 0108",
    program: "Data Science",
    appliedDate: "2026-01-28",
    stage: "Reviewing",
    gpa: "3.7",
    location: "Denver, CO",
  },
  {
    id: "9",
    name: "Isabella Rodriguez",
    email: "isabella.r@email.com",
    phone: "+1 213 555 0109",
    program: "Marketing",
    appliedDate: "2026-01-30",
    stage: "Applied",
    gpa: "3.4",
    location: "Los Angeles, CA",
  },
  {
    id: "10",
    name: "Liam Foster",
    email: "liam.foster@email.com",
    phone: "+1 215 555 0110",
    program: "Business Administration",
    appliedDate: "2026-02-01",
    stage: "Accepted",
    gpa: "3.8",
    location: "Philadelphia, PA",
  },
  {
    id: "11",
    name: "Zoe Kim",
    email: "zoe.kim@email.com",
    phone: "+1 503 555 0111",
    program: "Computer Science",
    appliedDate: "2026-02-03",
    stage: "Interview",
    gpa: "3.9",
    location: "Portland, OR",
  },
  {
    id: "12",
    name: "Daniel Okafor",
    email: "daniel.o@email.com",
    phone: "+1 713 555 0112",
    program: "Electrical Engineering",
    appliedDate: "2026-02-05",
    stage: "Reviewing",
    gpa: "3.6",
    location: "Houston, TX",
  },
  {
    id: "13",
    name: "Emma Larsson",
    email: "emma.larsson@email.com",
    phone: "+1 612 555 0113",
    program: "Finance",
    appliedDate: "2026-02-06",
    stage: "Applied",
    gpa: "3.5",
    location: "Minneapolis, MN",
  },
  {
    id: "14",
    name: "Carlos Mendez",
    email: "carlos.m@email.com",
    phone: "+1 210 555 0114",
    program: "Marketing",
    appliedDate: "2026-02-08",
    stage: "Confirmed",
    gpa: "3.7",
    location: "San Antonio, TX",
  },
  {
    id: "15",
    name: "Ava Johnson",
    email: "ava.j@email.com",
    phone: "+1 615 555 0115",
    program: "Psychology",
    appliedDate: "2026-02-10",
    stage: "Rejected",
    gpa: "3.2",
    location: "Nashville, TN",
  },
  {
    id: "16",
    name: "Ryan Park",
    email: "ryan.park@email.com",
    phone: "+1 408 555 0116",
    program: "Mechanical Engineering",
    appliedDate: "2026-02-11",
    stage: "Applied",
    gpa: "3.6",
    location: "San Jose, CA",
  },
  {
    id: "17",
    name: "Mia Dubois",
    email: "mia.dubois@email.com",
    phone: "+1 504 555 0117",
    program: "Data Science",
    appliedDate: "2026-02-12",
    stage: "Reviewing",
    gpa: "3.8",
    location: "New Orleans, LA",
  },
  {
    id: "18",
    name: "Omar Al-Rashid",
    email: "omar.ar@email.com",
    phone: "+1 313 555 0118",
    program: "Computer Science",
    appliedDate: "2026-02-14",
    stage: "Accepted",
    gpa: "3.9",
    location: "Detroit, MI",
  },
];

export const ALL_STAGES: ApplicationStage[] = [
  "Applied",
  "Reviewing",
  "Interview",
  "Confirmed",
  "Accepted",
  "Rejected",
];

export const ALL_PROGRAMS = [
  "All Programs",
  "Computer Science",
  "Business Administration",
  "Data Science",
  "Mechanical Engineering",
  "Finance",
  "Psychology",
  "Marketing",
  "Electrical Engineering",
];

const avatarColors = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#e11d48",
  "#0891b2",
  "#4f46e5",
  "#0f766e",
  "#ea580c",
  "#db2777",
];

export function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((item) => item[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
