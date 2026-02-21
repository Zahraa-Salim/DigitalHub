// File: src/hooks/useSticky.ts
// Purpose: Reusable React hook encapsulating shared state, side effects, or behavior.
// If you change this file: Changing return values, timing, or side effects can impact every component that consumes this hook.
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
