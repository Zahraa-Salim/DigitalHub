// File: src/sections/people.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import PeopleDirectory from "@/components/inner-pages/people/PeopleDirectory";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";

export const Participants = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="Participants" sub_title="Participants" />
        <PeopleDirectory mode="participants" />
      </main>
      <FooterOne />
    </>
  );
};

export const TeamMembers = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="Team Members" sub_title="Team" />
        <PeopleDirectory mode="team" />
      </main>
      <FooterOne />
    </>
  );
};

// Backward-compatible alias used by the instructors route.
export const Instructors = TeamMembers;
