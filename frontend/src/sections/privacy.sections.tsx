import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import PrivacyPage from "@/components/inner-pages/privacy/PrivacyPage";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const Privacy = () => {
  const breadcrumb = useCmsBreadcrumb("privacy", {
    defaultsTitle: "Privacy Policy",
    defaultsSubTitle: "Privacy",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <PrivacyPage />
      </main>
      <FooterOne />
    </>
  );
};

