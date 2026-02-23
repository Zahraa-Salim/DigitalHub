// File: src/sections/home.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import HomeOneAbout from "@/components/homes/home-one/About";
import HomeOneBanner from "@/components/homes/home-one/Banner";
import HomeOneBlog from "@/components/homes/home-one/Blog";
import HomeOneCourseArea from "@/components/homes/home-one/CourseArea";
import HomeOneFeatures from "@/components/homes/home-one/Features";
import HomeOneInstructor from "@/components/homes/home-one/Instructor";
import HomeOneInstructorTwo from "@/components/homes/home-one/InstructorTwo";
import HomeOneNewsletter from "@/components/homes/home-one/Newsletter";

export const HomeOne = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <HomeOneBanner />
        {/* <Categories /> */}
        <HomeOneAbout />
        <HomeOneCourseArea />
        <HomeOneNewsletter />
        <HomeOneInstructor />
        {/* <HomeOneFaqArea /> */}
        <HomeOneFeatures />
        <HomeOneInstructorTwo />
        <HomeOneBlog />
      </main>
      <FooterOne />
    </>
  );
};

