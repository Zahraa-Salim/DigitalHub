// File: src/sections/courses.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import CourseArea from "@/components/courses/course/CourseArea";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const Course = () => {
  const breadcrumb = useCmsBreadcrumb("programs", {
    defaultsTitle: "All Programs",
    defaultsSubTitle: "Programs",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <CourseArea />
      </main>
      <FooterOne />
    </>
  );
};

