import { AboutUs } from "@/sections/about.sections";
import Wrapper from "@/layouts/Wrapper";
import { PageMeta } from "@/components/PageMeta";

const page = () => {
  return (
    <Wrapper>
      <PageMeta
        title="About Us"
        description="Learn about The Digital Hub's mission, team, and programs."
        canonicalPath="/about-us"
      />
      <AboutUs />
    </Wrapper>
  );
};

export default page;
