import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import ApplyArea from "@/components/inner-pages/apply/ApplyArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";

export const Apply = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="Apply Now" sub_title="Apply" />
        <ApplyArea />
      </main>
      <FooterOne />
    </>
  );
};
