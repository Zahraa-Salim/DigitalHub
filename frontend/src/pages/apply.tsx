// File: frontend/src/pages/apply.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
import Wrapper from "@/layouts/Wrapper";
import { Apply } from "@/sections/apply.sections";

const page = () => {
  return (
    <Wrapper>
      <Apply />
    </Wrapper>
  );
};

export default page;
