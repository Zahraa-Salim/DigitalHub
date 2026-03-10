// File: frontend/src/pages/team.tsx
// Purpose: Acts as the route entry for the team page.
// It composes the shared layout with the main section component for this route.

import Wrapper from "@/layouts/Wrapper";
import { TeamMembers } from "@/sections/people.sections";

const TeamPage = () => {
  return (
    <Wrapper>
      <TeamMembers />
    </Wrapper>
  );
};

export default TeamPage;

