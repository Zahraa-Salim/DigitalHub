// File: frontend/src/pages/terms.tsx
// Purpose: Acts as the route entry for the terms page.
// It composes the shared layout with the main section component for this route.

import Wrapper from "@/layouts/Wrapper";
import { Terms } from "@/sections/terms.sections";

const TermsPage = () => {
  return (
    <Wrapper>
      <Terms />
    </Wrapper>
  );
};

export default TermsPage;

