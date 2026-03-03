import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import EventDetailsArea from "@/components/inner-pages/events/EventDetailsArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";

export const EventDetails = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="Event Details" sub_title="Events" />
        <EventDetailsArea />
      </main>
      <FooterOne />
    </>
  );
};

