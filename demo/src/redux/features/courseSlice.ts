import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import courses from '@/data/inner-data/InnerCourseData';

interface Course {
  id: number;
  // Add other properties of your courses here
}

interface CourseState {
  courses: Course[] | any[];
  course: Course | {};
}

const initialState: CourseState = {
  courses: courses,
  course: {},
};

export const courseSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    single_course: (state, action: PayloadAction<number>) => {
      state.course = state.courses.find((p) => Number(p.id) === Number(action.payload)) || {};
    },
  },
});

export const { single_course } = courseSlice.actions;

// Selectors
export const selectCourses = (state: { courses: CourseState }) => state?.courses?.courses;
export const selectCourse = (state: { courses: CourseState }) => state?.courses?.course;

export default courseSlice.reducer;