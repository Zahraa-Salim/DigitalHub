// File: src/data/mock/programCourseMocks.ts
// Purpose: Static/mock dataset consumed by UI components and/or state layers.
// If you change this file: Changing field names, shapes, or values can break filters, mapping logic, or any consumer expecting the current schema.
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

