// File: frontend/src/pages/about-us.tsx
// Purpose: Acts as the route entry for the about us page.
// It composes the shared layout with the main section component for this route.

import { AboutUs } from "@/sections/about.sections";
import Wrapper from "@/layouts/Wrapper";

const page = () => {
   return (
      <Wrapper>
         <AboutUs />
      </Wrapper>
   )
}

export default page

