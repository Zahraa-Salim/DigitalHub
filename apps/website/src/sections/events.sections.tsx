// File: src/sections/events.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import EventsArea from "@/components/inner-pages/events/EventsArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";

export const Events = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="Upcoming Events" sub_title="Events" />
        <EventsArea />
      </main>
      <FooterOne />
    </>
  );
};
