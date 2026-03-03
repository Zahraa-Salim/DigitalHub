"use client";

import Link from "@/components/common/Link";
import HeaderTopOne from "./menu/HeaderTopOne";
import Image from "@/components/common/Image";
import NavMenu from "./menu/NavMenu";
import React, { useState } from "react";
import UseSticky from "@/hooks/UseSticky";
import MobileSidebar from "./menu/MobileSidebar";
import InjectableSvg from "@/hooks/InjectableSvg";
import dynamic from "@/utils/dynamic";
import { useAuth } from "@/context/AuthContext";


const CustomSelect = dynamic(() => import("@/ui/CustomSelect"), { ssr: false });

import logo from "@/assets/img/logo/digitalhub.png";

const HeaderOne = () => {
  const [selectedOption, setSelectedOption] = React.useState(null);

  const handleSelectChange = (option: React.SetStateAction<null>) => {
    setSelectedOption(option);
  };

  const { sticky } = UseSticky();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isHover, setIsHover] = useState<boolean>(false);

  // ✅ auth state
  const { user, loading, logout } = useAuth();
  const isStudent = !!user?.roles?.includes("STUDENT");

  const onLogout = async () => {
    await logout();
    // easiest way to update all UI and close any cached state
    window.location.href = "/";
  };

  return (
    <>
      <header>
        <HeaderTopOne />
        <div id="header-fixed-height"></div>
        <div
          id="sticky-header"
          className={`tg-header__area ${sticky ? "sticky-menu" : ""}`}
        >
          <div className="container custom-container">
            <div className="row">
              <div className="col-12">
                <div className="tgmenu__wrap">
                  <nav className="tgmenu__nav">
                    <div className="logo">
                      <Link to="/">
                        <Image src={logo} alt="Logo" />
                      </Link>
                    </div>

                    <div className="tgmenu__navbar-wrap tgmenu__main-menu d-none d-xl-flex">
                      <NavMenu />
                    </div>



                    <div className="tgmenu__action">
                      <ul className="list-wrap">


                        {/* ✅ Desktop auth buttons */}
                        <li className="header-btn login-btn">
                          {loading ? null : isStudent ? (
                            <div style={{ display: "flex", gap: 10 }}>
                              <Link to="/student-dashboard">Dashboard</Link>
                              <button
                                type="button"
                                onClick={onLogout}
                                onMouseEnter={() => setIsHover(true)}
                                onMouseLeave={() => setIsHover(false)}
                                style={{
                                  backgroundColor: isHover ? "#ffffff" : "#4B4B4B",
                                  color: isHover ? "#4B4B4B" : "#ffffff",
                                  border: isHover ? "1px solid #4B4B4B" : "1px solid transparent",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  padding: "6px 14px",
                                  font: "inherit",
                                  transition: "all 0.25s ease",
                                }}
                              >
                                Logout
                              </button>

                            </div>
                          ) : (
                            <Link to="/login">Log in</Link>
                          )}
                        </li>
                      </ul>
                    </div>

                    {/* ✅ Mobile icon: dashboard if logged in, otherwise login */}
                    <div className="mobile-login-btn">
                      {loading ? null : isStudent ? (
                        <Link to="/student-dashboard">
                          <InjectableSvg
                            src="/assets/img/icons/user.svg"
                            alt=""
                            className="injectable"
                          />
                        </Link>
                      ) : (
                        <Link to="/login">
                          <InjectableSvg
                            src="/assets/img/icons/user.svg"
                            alt=""
                            className="injectable"
                          />
                        </Link>
                      )}
                    </div>

                    <div
                      onClick={() => setIsActive(true)}
                      className="mobile-nav-toggler"
                    >
                      <i className="tg-flaticon-menu-1"></i>
                    </div>
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

export default HeaderOne;


