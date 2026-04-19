import Wrapper from "@/layouts/Wrapper";
import { TeamMembers } from "@/sections/people.sections";
import { PageMeta } from "@/components/PageMeta";

const TeamPage = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Our Team"
        description="Meet the team behind The Digital Hub."
        canonicalPath="/team"
      />
      <TeamMembers />
    </Wrapper>
  );
};

export default TeamPage;
