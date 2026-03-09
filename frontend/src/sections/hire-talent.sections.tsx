import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import HireTalentArea from "@/components/inner-pages/hire-talent/HireTalentArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const HireTalent = () => {
  const breadcrumb = useCmsBreadcrumb("hire_talent", {
    defaultsTitle: "Hire Talent",
    defaultsSubTitle: "Hire Talent",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <HireTalentArea />
      </main>
      <FooterOne />
    </>
  );
};
