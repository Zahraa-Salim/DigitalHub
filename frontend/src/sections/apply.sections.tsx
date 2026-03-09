import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import ApplyArea from "@/components/inner-pages/apply/ApplyArea";
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import { useCmsBreadcrumb } from "@/hooks/useCmsPage";

export const Apply = () => {
  const breadcrumb = useCmsBreadcrumb("apply", {
    defaultsTitle: "Apply Now",
    defaultsSubTitle: "Apply",
  });

  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title={breadcrumb.title} sub_title={breadcrumb.subTitle} />
        <ApplyArea />
      </main>
      <FooterOne />
    </>
  );
};
