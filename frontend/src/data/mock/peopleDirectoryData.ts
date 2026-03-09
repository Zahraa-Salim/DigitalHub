// File: frontend/src/data/mock/peopleDirectoryData.ts
// What this code does:
// 1) Stores static/mock data used by UI and development flows.
// 2) Defines predictable fixtures for cards, tables, and previews.
// 3) Supports testing UI states without live API dependency.
// 4) Keeps sample content centralized and reusable.
import type { StaticImageData } from "@/components/common/Image";
import {
  dbAdminsTemplate,
  dbInstructorsTemplate,
  dbStudentsTemplate,
  mapDbProfilesToPeopleMocks,
} from "@/data/mock/dbAlignedMockTemplates";

export type PeopleMode = "participants" | "team";

export type PersonCard = {
  id: number;
  mode: PeopleMode;
  name: string;
  role: string;
  primaryTag: string;
  secondaryTag: string;
  status: string;
  bio: string;
  avatar: StaticImageData;
  order: number;
};

export const peopleData: PersonCard[] = mapDbProfilesToPeopleMocks(
  dbStudentsTemplate,
  dbInstructorsTemplate,
  dbAdminsTemplate
);
