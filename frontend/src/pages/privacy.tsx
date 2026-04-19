import Wrapper from "@/layouts/Wrapper";
import { Privacy } from "@/sections/privacy.sections";
import { PageMeta } from "@/components/PageMeta";

const PrivacyPage = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Privacy Policy"
        description="Privacy policy for The Digital Hub."
        canonicalPath="/privacy"
      />
      <Privacy />
    </Wrapper>
  );
};

export default PrivacyPage;
