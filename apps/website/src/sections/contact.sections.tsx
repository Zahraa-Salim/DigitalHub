// File: src/sections/contact.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import ContactArea from "@/components/inner-pages/contact/ContactArea";

export const Contact = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="Contact With Us" sub_title="Contact" />
        <ContactArea />
      </main>
      <FooterOne />
    </>
  );
};

