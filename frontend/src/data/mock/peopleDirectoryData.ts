// File: frontend/src/data/mock/peopleDirectoryData.ts
// Purpose: Provides frontend data for people directory data.
// It stores mock or static content consumed by pages and components.

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

