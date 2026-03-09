import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import TermsPage from "@/components/inner-pages/privacy/TermsPage";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const Terms = () => {
  const breadcrumb = useCmsBreadcrumb("terms", {
    defaultsTitle: "Terms of Use",
    defaultsSubTitle: "Terms",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <TermsPage />
      </main>
      <FooterOne />
    </>
  );
};

