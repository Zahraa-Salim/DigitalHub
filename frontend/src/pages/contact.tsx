// File: frontend/src/pages/contact.tsx
// Purpose: Acts as the route entry for the contact page.
// It composes the shared layout with the main section component for this route.

import { Contact } from "@/sections/contact.sections";
import Wrapper from "@/layouts/Wrapper";

const page = () => {
   return (
      <Wrapper>
         <Contact />
      </Wrapper>
   )
}

export default page

