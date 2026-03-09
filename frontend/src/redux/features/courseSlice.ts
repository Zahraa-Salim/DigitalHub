// File: frontend/src/redux/features/courseSlice.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import courses from '@/data/mock/courseCatalogData';

type Course = (typeof courses)[number];

interface CourseState {
  courses: Course[];
  course: Course | null;
}

const initialState: CourseState = {
  courses: courses,
  course: null,
};

export const courseSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    single_course: (state, action: PayloadAction<number>) => {
      state.course = state.courses.find((p) => Number(p.id) === Number(action.payload)) ?? null;
    },
  },
});

export const { single_course } = courseSlice.actions;

// Selectors
export const selectCourses = (state: { courses: CourseState }) => state?.courses?.courses;
export const selectCourse = (state: { courses: CourseState }) => state?.courses?.course;

export default courseSlice.reducer;
