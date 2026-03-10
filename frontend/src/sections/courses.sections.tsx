// File: frontend/src/sections/courses.sections.tsx
// Purpose: Builds the main section composition for the courses sections page.
// It groups the larger page blocks that are rendered together for this view.

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

