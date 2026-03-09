// File: src/sections/about.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
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
