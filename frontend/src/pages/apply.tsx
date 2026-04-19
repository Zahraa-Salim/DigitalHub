import Wrapper from "@/layouts/Wrapper";
import { Apply } from "@/sections/apply.sections";
import { PageMeta } from "@/components/PageMeta";

const page = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Apply"
        description="Apply to join a program at The Digital Hub and build your digital skills."
        canonicalPath="/apply"
      />
      <Apply />
    </Wrapper>
  );
};

export default page;
