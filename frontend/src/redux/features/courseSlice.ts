// File: frontend/src/redux/features/courseSlice.ts
// Purpose: Stores Redux state and reducers for course slice.
// It defines how this slice of frontend state is updated and selected.

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

