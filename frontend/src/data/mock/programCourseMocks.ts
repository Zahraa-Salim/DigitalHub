// File: frontend/src/data/mock/programCourseMocks.ts
// Purpose: Provides frontend data for program course mocks.
// It stores mock or static content consumed by pages and components.

import type { StaticImageData } from "@/components/common/Image";
import {
  dbCohortsTemplate,
  dbProgramsTemplate,
  mapDbProgramsToCourseMocks,
} from "@/data/mock/dbAlignedMockTemplates";

export type MockCategory = {
  id: number;
  name: string;
  slug: string;
};

export type MockCourse = {
  id: number;
  title: string;
  shortDescription: string;
  category: MockCategory;
  level: string;
  durationLabel: string;
  createdAt: string;
  instructorName: string;
  thumb: StaticImageData;
  rating: number;
};

export const mockCourses: MockCourse[] = mapDbProgramsToCourseMocks(
  dbProgramsTemplate,
  dbCohortsTemplate
);

export const mockCategories: MockCategory[] = Array.from(
  new Map(mockCourses.map((course) => [course.category.name, course.category])).values()
);

