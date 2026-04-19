import Wrapper from "@/layouts/Wrapper";
import { Participants } from "@/sections/people.sections";
import { PageMeta } from "@/components/PageMeta";

const ParticipantsPage = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Participants"
        description="Meet current and past participants of The Digital Hub programs."
        canonicalPath="/participants"
      />
      <Participants />
    </Wrapper>
  );
};

export default ParticipantsPage;
