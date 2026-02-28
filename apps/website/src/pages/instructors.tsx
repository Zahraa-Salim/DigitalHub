// File: src/pages/instructors.tsx
// Purpose: Route entry module that maps a URL path to a page-level component tree.
// If you change this file: Changing imports or exported component behavior can alter route output or break navigation for this path.
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


