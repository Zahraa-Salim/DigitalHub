// File: frontend/src/sections/apply.sections.tsx
// Purpose: Builds the main section composition for the apply sections page.
// It groups the larger page blocks that are rendered together for this view.

import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import ApplyArea from "@/components/inner-pages/apply/ApplyArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const Apply = () => {
  const breadcrumb = useCmsBreadcrumb("apply", {
    defaultsTitle: "Apply Now",
    defaultsSubTitle: "Apply",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <ApplyArea />
      </main>
      <FooterOne />
    </>
  );
};

