// File: frontend/src/sections/misc.sections.tsx
// Purpose: Builds the main section composition for the misc sections page.
// It groups the larger page blocks that are rendered together for this view.

import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import ErrorArea from "@/components/inner-pages/error/ErrorArea";

export const NotFoundContent = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <ErrorArea />
      </main>
      <FooterOne />
    </>
  );
};

