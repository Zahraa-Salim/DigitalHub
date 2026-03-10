// File: frontend/src/pages/home.tsx
// Purpose: Acts as the route entry for the home page.
// It composes the shared layout with the main section component for this route.

import { HomeOne } from "@/sections/home.sections";
import Wrapper from "@/layouts/Wrapper";

const index = () => {
  return (
    <Wrapper>
      <HomeOne />
    </Wrapper>
  )
}

export default index

