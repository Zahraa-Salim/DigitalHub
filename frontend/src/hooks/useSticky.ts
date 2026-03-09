// File: frontend/src/hooks/useSticky.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
"use client";

import { useEffect, useState } from "react";

interface StickyState {
   sticky: boolean;
}

const useSticky = (): StickyState => {
   const [sticky, setSticky] = useState(false);

   const stickyHeader = (): void => {
      if (window.scrollY > 200) {
         setSticky(true);
      } else {
         setSticky(false);
      }
   };

   useEffect(() => {
      window.addEventListener("scroll", stickyHeader);

      return (): void => {
         window.removeEventListener("scroll", stickyHeader);
      };
   }, []);
   return {
      sticky,
   };
}

export default useSticky;
