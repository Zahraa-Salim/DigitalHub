import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Wrapper from "@/layouts/Wrapper";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <Wrapper>
      <HeaderOne />
      <main className="main-area fix">
        <Outlet />
      </main>
      <FooterOne />
    </Wrapper>
  );
};

export default MainLayout;
