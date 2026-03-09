// File: frontend/src/sections/about.sections.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import About from "@/components/inner-pages/about-us/About";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const AboutUs = () => {
  const breadcrumb = useCmsBreadcrumb("about", {
    defaultsTitle: "Build skills. Become employable.",
    defaultsSubTitle: "About Us",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <About />
      </main>
      <FooterOne />
    </>
  );
};
