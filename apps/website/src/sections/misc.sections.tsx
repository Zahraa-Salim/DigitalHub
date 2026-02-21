// File: src/sections/misc.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
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

