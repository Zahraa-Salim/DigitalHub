// File: src/layouts/Wrapper.tsx
// Purpose: Shared layout container used across pages and sections.
// If you change this file: Changing structure or wrapper logic can affect navigation, shared UI placement, and consistency across routes.
"use client";
import { ReactNode, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import ScrollToTop from "@/components/common/ScrollToTop";
import AOS from "aos";
import MotionAnimation from "@/hooks/MotionAnimation";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

type WrapperProps = {
    children: ReactNode;
};

const Wrapper = ({ children }: WrapperProps) => {

    useEffect(() => {
        AOS.init();
    }, [])

    MotionAnimation();

    return <>
        {children}
        <ScrollToTop />
        <ToastContainer position="top-center" />
    </>;
}

export default Wrapper
