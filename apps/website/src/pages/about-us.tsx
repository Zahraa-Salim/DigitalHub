// File: src/pages/about-us.tsx
// Purpose: Route entry module that maps a URL path to a page-level component tree.
// If you change this file: Changing imports or exported component behavior can alter route output or break navigation for this path.
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

