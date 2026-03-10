// File: frontend/src/sections/events.sections.tsx
// Purpose: Builds the main section composition for the events sections page.
// It groups the larger page blocks that are rendered together for this view.

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

