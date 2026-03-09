// File: frontend/src/data/mock/programCourseMocks.ts
// What this code does:
// 1) Stores static/mock data used by UI and development flows.
// 2) Defines predictable fixtures for cards, tables, and previews.
// 3) Supports testing UI states without live API dependency.
// 4) Keeps sample content centralized and reusable.
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

