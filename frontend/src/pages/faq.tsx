// File: frontend/src/pages/faq.tsx
// Purpose: Acts as the route entry for the FAQ page.
// It composes the shared layout with the main section component for this route.

import Wrapper from "@/layouts/Wrapper";
import { Faq } from "@/sections/faq.sections";

const FaqPage = () => {
  return (
    <Wrapper>
      <Faq />
    </Wrapper>
  );
};

export default FaqPage;

