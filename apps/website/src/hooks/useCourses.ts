// File: src/hooks/useCourses.ts
// Purpose: Reusable React hook encapsulating shared state, side effects, or behavior.
// If you change this file: Changing return values, timing, or side effects can impact every component that consumes this hook.
import { selectCourses } from "@/redux/features/courseSlice";
import { useState } from "react";
import { useSelector } from "react-redux";

const useCourses = () => {
   const [courses, setCourses] = useState(useSelector(selectCourses))
   return {
      courses,
      setCourses
   }
}

export default useCourses;
