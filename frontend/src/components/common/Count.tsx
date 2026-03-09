// File: frontend/src/components/common/Count.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
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
