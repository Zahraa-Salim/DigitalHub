// File: frontend/src/sections/events.sections.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
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
