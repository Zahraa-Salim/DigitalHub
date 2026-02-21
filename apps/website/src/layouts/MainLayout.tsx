// File: src/layouts/MainLayout.tsx
// Purpose: Shared layout container used across pages and sections.
// If you change this file: Changing structure or wrapper logic can affect navigation, shared UI placement, and consistency across routes.
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
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

