// File: frontend/src/hooks/useCourses.ts
// Purpose: Provides the use courses hook or helper component.
// It packages reusable view or state behavior for other frontend modules.

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

