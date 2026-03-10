// File: frontend/src/pages/events.tsx
// Purpose: Acts as the route entry for the events page.
// It composes the shared layout with the main section component for this route.

import { Events } from "@/sections/events.sections";
import Wrapper from "@/layouts/Wrapper";

const page = () => {
  return (
    <Wrapper>
      <Events />
    </Wrapper>
  );
};

export default page;

