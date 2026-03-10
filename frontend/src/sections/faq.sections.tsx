// File: frontend/src/sections/faq.sections.tsx
// Purpose: Builds the main section composition for the FAQ sections page.
// It groups the larger page blocks that are rendered together for this view.

import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import FaqPage from "@/components/inner-pages/faq/FaqPage";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const Faq = () => {
  const breadcrumb = useCmsBreadcrumb("faq", {
    defaultsTitle: "Frequently Asked Questions",
    defaultsSubTitle: "FAQ",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <FaqPage />
      </main>
      <FooterOne />
    </>
  );
};

