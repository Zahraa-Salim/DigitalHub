// File: frontend/src/layouts/MainLayout.tsx
// Purpose: Provides the shared layout structure for main layout.
// It wraps pages with the common shell pieces needed by this part of the UI.

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

