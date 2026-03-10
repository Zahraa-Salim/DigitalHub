// File: frontend/src/pages/hire-talent.tsx
// Purpose: Acts as the route entry for the hire talent page.
// It composes the shared layout with the main section component for this route.

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

