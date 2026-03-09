// File: src/redux/features/courseSlice.ts
// Purpose: Redux store/slice module controlling application state and selectors.
// If you change this file: Changing state shape, reducers, or selectors can break hooks/components that rely on this state contract.
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
