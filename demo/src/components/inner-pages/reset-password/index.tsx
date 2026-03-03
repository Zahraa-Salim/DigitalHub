import HeaderOne from "@/layouts/headers/HeaderOne";
import FooterOne from "@/layouts/footers/FooterOne";
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne";
import ResetPasswordArea from "./ResetPasswordArea";

const ResetPassword = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <BreadcrumbOne title="Reset Password" sub_title="Reset Password" />
        <ResetPasswordArea />
      </main>
      <FooterOne />
    </>
  );
};

export default ResetPassword;
