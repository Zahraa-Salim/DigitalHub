// File: frontend/src/hooks/useScrollToTop.ts
// Purpose: Provides the use scroll to top hook or helper component.
// It packages reusable view or state behavior for other frontend modules.

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const useScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
};

export default useScrollToTop;

