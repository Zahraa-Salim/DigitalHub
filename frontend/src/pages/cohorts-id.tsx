// File: frontend/src/pages/cohorts-id.tsx
// Purpose: Acts as the route entry for the cohorts ID page.
// It composes the shared layout with the main section component for this route.

import Wrapper from "@/layouts/Wrapper";
import { CohortDetails } from "@/sections/cohorts-id.sections";

const page = () => {
  return (
    <Wrapper>
      <CohortDetails />
    </Wrapper>
  );
};

export default page;

