import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import HireTalentArea from "@/components/inner-pages/hire-talent/HireTalentArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";

export const HireTalent = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="Hire Talent" sub_title="Hire Talent" />
        <HireTalentArea />
      </main>
      <FooterOne />
    </>
  );
};
