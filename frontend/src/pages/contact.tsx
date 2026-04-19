import { Contact } from "@/sections/contact.sections";
import Wrapper from "@/layouts/Wrapper";
import { PageMeta } from "@/components/PageMeta";

const page = () => {
  return (
    <Wrapper>
      <PageMeta
        title="Contact"
        description="Get in touch with The Digital Hub. Send us a message or find our location."
        canonicalPath="/contact"
      />
      <Contact />
    </Wrapper>
  );
};

export default page;
