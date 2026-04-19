import Wrapper from "@/layouts/Wrapper";
import { Faq } from "@/sections/faq.sections";
import { PageMeta } from "@/components/PageMeta";

const FaqPage = () => {
  return (
    <Wrapper>
      <PageMeta
        title="FAQ"
        description="Frequently asked questions about The Digital Hub programs and admissions."
        canonicalPath="/faq"
      />
      <Faq />
    </Wrapper>
  );
};

export default FaqPage;
