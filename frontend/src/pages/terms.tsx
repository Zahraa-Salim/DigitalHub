import Wrapper from "@/layouts/Wrapper";
import { Terms } from "@/sections/terms.sections";
import { PageMeta } from "@/components/PageMeta";

const TermsPage = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Terms & Conditions"
        description="Terms and conditions for The Digital Hub."
        canonicalPath="/terms"
      />
      <Terms />
    </Wrapper>
  );
};

export default TermsPage;
