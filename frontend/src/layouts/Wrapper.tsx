// File: frontend/src/layouts/Wrapper.tsx
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
"use client";
import { ReactNode, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import { Slide } from "react-toastify";
import ScrollToTop from "@/components/common/ScrollToTop";
import AOS from "aos";
import MotionAnimation from "@/hooks/MotionAnimation";
import useScrollToTop from "@/hooks/useScrollToTop";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

type WrapperProps = {
    children: ReactNode;
};

const Wrapper = ({ children }: WrapperProps) => {

    useScrollToTop();

    useEffect(() => {
        AOS.init();
    }, [])

    MotionAnimation();

    return <>
        {children}
        <ScrollToTop />
        <ToastContainer
            position="top-right"
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable={false}
            limit={4}
            transition={Slide}
            className="dh-toast-container"
        />
    </>;
}

export default Wrapper
