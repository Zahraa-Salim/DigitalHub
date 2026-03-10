// File: frontend/src/pages/events-slug.tsx
// Purpose: Acts as the route entry for the events slug page.
// It composes the shared layout with the main section component for this route.

import Wrapper from "@/layouts/Wrapper";
import { EventDetails } from "@/sections/events-slug.sections";

const page = () => {
  return (
    <Wrapper>
      <EventDetails />
    </Wrapper>
  );
};

export default page;

