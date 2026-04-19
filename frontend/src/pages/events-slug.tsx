import Wrapper from "@/layouts/Wrapper";
import { EventDetails } from "@/sections/events-slug.sections";
import { PageMeta } from "@/components/PageMeta";

const page = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Event Details"
        description="Event details, gallery, and information at The Digital Hub."
      />
      <EventDetails />
    </Wrapper>
  );
};

export default page;
