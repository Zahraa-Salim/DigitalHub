import Wrapper from "@/layouts/Wrapper";
import { HireTalent } from "@/sections/hire-talent.sections";
import { PageMeta } from "@/components/PageMeta";

const HireTalentPage = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Hire Talent"
        description="Discover and recruit skilled graduates from The Digital Hub programs."
        canonicalPath="/hire-talent"
      />
      <HireTalent />
    </Wrapper>
  );
};

export default HireTalentPage;
