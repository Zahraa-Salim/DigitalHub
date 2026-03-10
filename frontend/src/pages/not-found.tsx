// File: frontend/src/pages/not-found.tsx
// Purpose: Acts as the route entry for the not found page.
// It composes the shared layout with the main section component for this route.

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

