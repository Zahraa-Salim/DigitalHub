// File: frontend/src/sections/contact.sections.tsx
// Purpose: Builds the main section composition for the contact sections page.
// It groups the larger page blocks that are rendered together for this view.

import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import ContactArea from "@/components/inner-pages/contact/ContactArea";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const Contact = () => {
  const breadcrumb = useCmsBreadcrumb("contact", {
    defaultsTitle: "Contact With Us",
    defaultsSubTitle: "Contact",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <ContactArea />
      </main>
      <FooterOne />
    </>
  );
};

