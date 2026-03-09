// File: frontend/src/sections/people.sections.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
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
