// File: frontend/src/pages/contact.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
import { Contact } from "@/sections/contact.sections";
import Wrapper from "@/layouts/Wrapper";

const page = () => {
   return (
      <Wrapper>
         <Contact />
      </Wrapper>
   )
}

export default page

