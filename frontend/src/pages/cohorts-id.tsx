import Wrapper from "@/layouts/Wrapper";
import { CohortDetails } from "@/sections/cohorts-id.sections";
import { PageMeta } from "@/components/PageMeta";

const page = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Program Details"
        description="View cohort details, schedule, instructors, and enrollment information."
      />
      <CohortDetails />
    </Wrapper>
  );
};

export default page;
