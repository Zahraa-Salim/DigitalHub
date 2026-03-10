// File: frontend/src/components/common/Count.tsx
// Purpose: Renders the shared count UI element used across the site.
// It keeps common presentation behavior reusable between pages and sections.

"use client"
import { useState } from "react";
import CountUp from "react-countup";
import { InView } from "react-intersection-observer";

interface CountType {
  number: number;
}

const Count = ({ number }: CountType) => {
  const [focus, setFocus] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const hasCountedBefore = window.localStorage.getItem("hasCountedBefore");
    if (!hasCountedBefore) {
      window.localStorage.setItem("hasCountedBefore", "true");
      return true;
    }
    return false;
  });

  return (
    <>
      <CountUp start={0} end={focus ? number : 0} duration={2} decimals={number % 1 !== 0 ? 1 : 0}>
        {({ countUpRef }) => (
          <>
            <span ref={countUpRef} />
            <InView
              as="span"
              onChange={(inView: boolean) => {
                if (inView && !focus) {
                  setFocus(true);
                }
              }}
            ></InView>
          </>
        )}
      </CountUp>
    </>
  );
};

export default Count;

