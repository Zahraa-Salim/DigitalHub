// File: src/pages/team.tsx
// Purpose: Route entry module that maps a URL path to a page-level component tree.
// If you change this file: Changing imports or exported component behavior can alter route output or break navigation for this path.
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


