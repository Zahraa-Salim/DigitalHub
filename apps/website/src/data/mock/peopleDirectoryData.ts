// File: src/data/mock/peopleDirectoryData.ts
// Purpose: Static/mock dataset consumed by UI components and/or state layers.
// If you change this file: Changing field names, shapes, or values can break filters, mapping logic, or any consumer expecting the current schema.
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
