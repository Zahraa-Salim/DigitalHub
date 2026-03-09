import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import EventDetailsArea from "@/components/inner-pages/events/EventDetailsArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const EventDetails = () => {
  const breadcrumb = useCmsBreadcrumb("event_details", {
    defaultsTitle: "Event Details",
    defaultsSubTitle: "Events",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <EventDetailsArea />
      </main>
      <FooterOne />
    </>
  );
};
