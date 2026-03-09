// File: frontend/src/pages/instructors.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
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


