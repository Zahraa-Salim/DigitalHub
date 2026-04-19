import { Course } from "@/sections/courses.sections";
import Wrapper from "@/layouts/Wrapper";
import { PageMeta } from "@/components/PageMeta";

const page = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Programs"
        description="Browse all programs and upcoming cohorts at The Digital Hub."
        canonicalPath="/programs"
      />
      <Course />
    </Wrapper>
  );
};

export default page;
