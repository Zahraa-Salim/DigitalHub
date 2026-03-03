import { StaticImageData } from "@/components/common/Image";

import course_thumb1 from "@/assets/img/courses/course_thumb01.jpg"
import course_thumb2 from "@/assets/img/courses/course_thumb02.jpg"
import course_thumb3 from "@/assets/img/courses/course_thumb03.jpg"

import course_avatar1 from "@/assets/img/courses/course_author001.png"
import course_avatar2 from "@/assets/img/courses/course_author002.png"
import course_avatar3 from "@/assets/img/courses/course_author003.png"

interface DataType {
   id: number;
   thumb: StaticImageData;
   title: string;
   tag: string;
   avatar_thumb: StaticImageData;
   avatar_name: string;
   review: string;
   skill: number;
   book: string;
   time: string;
   progress: number;
   mortarboard: string;
}[]

const student_dashboard_data: DataType[] = [
   {
      id: 1,
      thumb: course_thumb1,
      title: "Learning JavaScript With Imagination",
      tag: "Development",
      avatar_thumb: course_avatar1,
      avatar_name: "David Millar",
      review: "(4.5 Reviews)",
      skill: 88,
      book: "05",
      time: "11h 20m",
      mortarboard: "22",
      progress: 88,
   },
   {
      id: 2,
      thumb: course_thumb2,
      title: "The Complete Graphic Design for Beginners",
      tag: "Design",
      avatar_thumb: course_avatar2,
      avatar_name: "Wilson",
      review: "(4.5 Reviews)",
      skill: 70,
      book: "60",
      time: "70h 45m",
      mortarboard: "202",
      progress: 70,
   },
   {
      id: 3,
      thumb: course_thumb3,
      title: "Learning JavaScript With Imagination",
      tag: "Data Science",
      avatar_thumb: course_avatar3,
      avatar_name: "Warren",
      review: "(4.5 Reviews)",
      skill: 95,
      book: "08",
      time: "18h 20m",
      mortarboard: "66",
      progress: 95,
   },
];

export default student_dashboard_data;
