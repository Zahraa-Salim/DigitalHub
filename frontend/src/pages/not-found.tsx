// File: frontend/src/pages/not-found.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
import { NotFoundContent } from "@/sections/misc.sections";
import Wrapper from "@/layouts/Wrapper";

const NotFoundPage = () => {
  return (
    <Wrapper>
      <NotFoundContent />
    </Wrapper>
  );
};

export default NotFoundPage;

