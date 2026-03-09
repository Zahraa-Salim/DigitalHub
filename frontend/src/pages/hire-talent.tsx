// File: frontend/src/pages/hire-talent.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
import Wrapper from "@/layouts/Wrapper";
import { HireTalent } from "@/sections/hire-talent.sections";

const HireTalentPage = () => {
  return (
    <Wrapper>
      <HireTalent />
    </Wrapper>
  );
};

export default HireTalentPage;
