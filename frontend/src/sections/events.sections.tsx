// File: src/sections/events.sections.tsx
// Purpose: Page composition module that combines reusable components into a full section/page flow.
// If you change this file: Changing composition order or included components will alter page structure and user experience on related routes.
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import EventsArea from "@/components/inner-pages/events/EventsArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const Events = () => {
  const breadcrumb = useCmsBreadcrumb("events", {
    defaultsTitle: "Upcoming Events",
    defaultsSubTitle: "Events",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <EventsArea />
      </main>
      <FooterOne />
    </>
  );
};
