// File: src/sections/courses.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";

import CourseArea from "@/components/courses/course/CourseArea";

export const Course = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="All Programs" sub_title="Progrmas" />
        <CourseArea />
      </main>
      <FooterOne />
    </>
  );
};

