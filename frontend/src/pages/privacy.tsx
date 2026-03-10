// File: frontend/src/pages/privacy.tsx
// Purpose: Acts as the route entry for the privacy page.
// It composes the shared layout with the main section component for this route.

import Wrapper from "@/layouts/Wrapper";
import { Privacy } from "@/sections/privacy.sections";

const PrivacyPage = () => {
  return (
    <Wrapper>
      <Privacy />
    </Wrapper>
  );
};

export default PrivacyPage;

