// File: src/sections/about.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import Feature from "@/components/homes/home-two/Feature";
import Newsletter from "@/components/homes/home-two/Newsletter";
import Features from "@/components/homes/home-one/Features";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import About from "@/components/inner-pages/about-us/About";
import Testimonial from "@/components/inner-pages/about-us/Testimonial";

export const AboutUs = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="Who We Are" sub_title="About Us" />
        <About />
        <Feature style={true} />
        <Newsletter />
        <Features />
        <Testimonial />
      </main>
      <FooterOne />
    </>
  );
};

