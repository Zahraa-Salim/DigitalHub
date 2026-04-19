import { HomeOne } from "@/sections/home.sections";
import Wrapper from "@/layouts/Wrapper";
import { PageMeta } from "@/components/PageMeta";

const index = () => {
  return (
    <Wrapper>
      <PageMeta
        description="Build your digital skills for work, freelancing, and the digital economy. Programs designed to build skills and employability."
        canonicalPath="/"
      />
      <HomeOne />
    </Wrapper>
  )
}

export default index
