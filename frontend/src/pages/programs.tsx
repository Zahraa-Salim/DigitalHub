// File: frontend/src/pages/programs.tsx
// Purpose: Acts as the route entry for the programs page.
// It composes the shared layout with the main section component for this route.

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

