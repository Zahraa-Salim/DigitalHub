// File: frontend/src/pages/events-slug.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
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

