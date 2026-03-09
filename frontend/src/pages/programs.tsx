// File: src/pages/programs.tsx
// Purpose: Route entry module for the public Programs page.
import { Course } from "@/sections/courses.sections";
import Wrapper from "@/layouts/Wrapper";

const page = () => {
  return (
    <Wrapper>
      <Course />
    </Wrapper>
  );
};

export default page;

