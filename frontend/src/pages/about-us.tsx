// File: frontend/src/pages/about-us.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
import { AboutUs } from "@/sections/about.sections";
import Wrapper from "@/layouts/Wrapper";

const page = () => {
   return (
      <Wrapper>
         <AboutUs />
      </Wrapper>
   )
}

export default page

