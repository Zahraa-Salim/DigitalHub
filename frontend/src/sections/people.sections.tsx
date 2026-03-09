// File: src/sections/people.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import PeopleDirectory from "@/components/inner-pages/people/PeopleDirectory";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const Participants = () => {
  const breadcrumb = useCmsBreadcrumb("participants", {
    defaultsTitle: "Participants",
    defaultsSubTitle: "Participants",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <PeopleDirectory mode="participants" />
      </main>
      <FooterOne />
    </>
  );
};

export const TeamMembers = () => {
  const breadcrumb = useCmsBreadcrumb("team", {
    defaultsTitle: "Team Members",
    defaultsSubTitle: "Team",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <PeopleDirectory mode="team" />
      </main>
      <FooterOne />
    </>
  );
};

export const Instructors = () => {
  const breadcrumb = useCmsBreadcrumb("instructors", {
    defaultsTitle: "Instructors",
    defaultsSubTitle: "Instructors",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <PeopleDirectory mode="team" />
      </main>
      <FooterOne />
    </>
  );
};
