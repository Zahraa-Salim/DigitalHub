// File: frontend/src/sections/apply.sections.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
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
