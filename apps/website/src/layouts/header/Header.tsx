// File: src/layouts/header/Header.tsx
// Purpose: Shared layout container used across pages and sections.
// If you change this file: Changing structure or wrapper logic can affect navigation, shared UI placement, and consistency across routes.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import useSticky from "@/hooks/useSticky";
import logo from "@/assets/img/logo/digitalhub.png";
import { useState } from "react";
import { MobileSidebar, NavMenu } from "./nav";

const Header = () => {
  const { sticky } = useSticky();
  const [isActive, setIsActive] = useState<boolean>(false);

  return (
    <>
      <header>
        <div id="header-fixed-height"></div>
        <div
          id="sticky-header"
          className={`tg-header__area dh-navbar ${sticky ? "sticky-menu" : ""}`}
        >
          <div className="container custom-container">
            <div className="row">
              <div className="col-12">
                <div className="tgmenu__wrap">
                  <nav className="tgmenu__nav dh-navbar__inner">
                    <div className="logo dh-navbar__logo">
                      <Link to="/">
                        <Image src={logo} alt="Logo" />
                      </Link>
                    </div>

                    <div className="tgmenu__navbar-wrap tgmenu__main-menu dh-navbar__center d-none d-lg-flex">
                      <NavMenu />
                    </div>

                    <div className="tgmenu__action dh-navbar__actions d-none d-lg-flex">
                      <Link to="/courses" className="dh-auth-btn dh-auth-btn--special">
                        Apply Now
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsActive(true)}
                      className="mobile-nav-toggler d-lg-none dh-mobile-toggler"
                      aria-label="Open menu"
                    >
                      <i className="tg-flaticon-menu-1"></i>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <MobileSidebar isActive={isActive} setIsActive={setIsActive} />
    </>
  );
};

export default Header;
