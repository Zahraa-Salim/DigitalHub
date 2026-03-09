// File: frontend/src/hooks/useCourses.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
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
