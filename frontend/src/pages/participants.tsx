// File: frontend/src/pages/participants.tsx
// Purpose: Acts as the route entry for the participants page.
// It composes the shared layout with the main section component for this route.

import Wrapper from "@/layouts/Wrapper";
import { Participants } from "@/sections/people.sections";

const ParticipantsPage = () => {
  return (
    <Wrapper>
      <Participants />
    </Wrapper>
  );
};

export default ParticipantsPage;

