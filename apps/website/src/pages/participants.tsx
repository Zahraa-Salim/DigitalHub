// File: src/pages/participants.tsx
// Purpose: Route entry module that maps a URL path to a page-level component tree.
// If you change this file: Changing imports or exported component behavior can alter route output or break navigation for this path.
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


