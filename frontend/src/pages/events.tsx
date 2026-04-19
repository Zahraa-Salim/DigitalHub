import { Events } from "@/sections/events.sections";
import Wrapper from "@/layouts/Wrapper";
import { PageMeta } from "@/components/PageMeta";

const page = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Events"
        description="Upcoming and past events at The Digital Hub."
        canonicalPath="/events"
      />
      <Events />
    </Wrapper>
  );
};

export default page;
