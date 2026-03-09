// File: frontend/src/sections/misc.sections.tsx
// What this code does:
// 1) Composes route-level views and page section structure.
// 2) Orchestrates page-level data loading and state.
// 3) Connects reusable components to navigation flow.
// 4) Exports page modules consumed by the router.
import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/header/Header";
import ErrorArea from "@/components/inner-pages/error/ErrorArea";

export const NotFoundContent = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <ErrorArea />
      </main>
      <FooterOne />
    </>
  );
};

