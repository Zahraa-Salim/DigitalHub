// File: src/hooks/useScrollToTop.ts
// Purpose: Hook that automatically scrolls page to top when route changes.
// If you change this file: The page scroll behavior on navigation will be affected.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const useScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
};

export default useScrollToTop;
