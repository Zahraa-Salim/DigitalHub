// File: src/components/common/Count.tsx
// Purpose: UI component responsible for rendering part of the interface (common/Count.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client"
import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { InView } from "react-intersection-observer";

interface CountType {
  number: number;
}

const Count = ({ number }: CountType) => {
  const [focus, setFocus] = useState<boolean>(false);

  useEffect(() => {
    const hasCountedBefore = localStorage.getItem("hasCountedBefore");

    if (!hasCountedBefore) {
      setFocus(true);
      localStorage.setItem("hasCountedBefore", "true");
    }
  }, []);

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