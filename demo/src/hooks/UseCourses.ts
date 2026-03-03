import { selectCourses } from "@/redux/features/courseSlice";
import { useState } from "react";
import { useSelector } from "react-redux";

const UseCourses = () => {
   const [courses, setCourses] = useState(useSelector(selectCourses))
   return {
      courses,
      setCourses
   }
}

export default UseCourses