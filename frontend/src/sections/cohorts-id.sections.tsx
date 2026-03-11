// File: frontend/src/sections/cohorts-id.sections.tsx
// Purpose: Builds the main section composition for the cohorts ID sections page.
// It groups the larger page blocks that are rendered together for this view.

import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import CohortDetailsArea from "@/components/inner-pages/cohorts/CohortDetailsArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const CohortDetails = () => {
  const breadcrumb = useCmsBreadcrumb("cohort_details", {
    defaultsTitle: "Program Details",
    defaultsSubTitle: "Programs",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <CohortDetailsArea />
      </main>
      <FooterOne />
    </>
  );
};

