// File: src/pages/not-found.tsx
// Purpose: Route entry module that maps a URL path to a page-level component tree.
// If you change this file: Changing imports or exported component behavior can alter route output or break navigation for this path.
import { NotFoundContent } from "@/sections/misc.sections";
import Wrapper from "@/layouts/Wrapper";

const NotFoundPage = () => {
  return (
    <Wrapper>
      <NotFoundContent />
    </Wrapper>
  );
};

export default NotFoundPage;

