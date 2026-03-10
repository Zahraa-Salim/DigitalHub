// File: frontend/src/pages/apply.tsx
// Purpose: Acts as the route entry for the apply page.
// It composes the shared layout with the main section component for this route.

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

