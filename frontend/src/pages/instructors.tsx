import { Instructors } from "@/sections/people.sections";
import Wrapper from "@/layouts/Wrapper";
import { PageMeta } from "@/components/PageMeta";

const InstructorsPage = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Instructors"
        description="Meet the instructors at The Digital Hub."
        canonicalPath="/instructors"
      />
      <Instructors />
    </Wrapper>
  );
};

export default InstructorsPage;
