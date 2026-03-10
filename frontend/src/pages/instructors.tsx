// File: frontend/src/pages/instructors.tsx
// Purpose: Acts as the route entry for the instructors page.
// It composes the shared layout with the main section component for this route.

import { Instructors } from "@/sections/people.sections";
import Wrapper from "@/layouts/Wrapper";

const InstructorsPage = () => {
   return (
      <Wrapper>
         <Instructors />
      </Wrapper>
   )
}

export default InstructorsPage

