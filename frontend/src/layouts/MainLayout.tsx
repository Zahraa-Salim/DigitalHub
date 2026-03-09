// File: frontend/src/layouts/MainLayout.tsx
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
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

