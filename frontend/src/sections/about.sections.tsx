// File: frontend/src/sections/about.sections.tsx
// Purpose: Builds the main section composition for the about sections page.
// It groups the larger page blocks that are rendered together for this view.

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

