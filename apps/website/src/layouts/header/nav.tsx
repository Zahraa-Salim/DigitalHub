// File: src/layouts/header/nav.tsx
// Purpose: Shared layout container used across pages and sections.
// If you change this file: Changing structure or wrapper logic can affect navigation, shared UI placement, and consistency across routes.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { usePathname } from "@/utils/navigation";
import { useState } from "react";

import logo from "@/assets/img/logo/digitalhub.png";

type MenuItem = {
  id: number;
  title: string;
  link: string;
  children?: MenuItem[];
};

const menuData: MenuItem[] = [
  {
    id: 1,
    title: "Home",
    link: "/",
  },
  {
    id: 2,
    title: "Programs",
    link: "/courses",
  },
  {
    id: 3,
    title: "About",
    link: "/about-us",
    children: [
      {
        id: 31,
        title: "Mission",
        link: "/about-us",
      },
      {
        id: 32,
        title: "Team",
        link: "/team",
      },
      {
        id: 33,
        title: "Events",
        link: "/events",
      },
    ],
  },
  {
    id: 4,
    title: "Participants",
    link: "/participants",
  },
  {
    id: 5,
    title: "Contact",
    link: "/contact",
  },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

const isMenuActive = (pathname: string, item: MenuItem) => {
  if (isActive(pathname, item.link)) return true;
  if (!item.children) return false;
  return item.children.some((child) => isActive(pathname, child.link));
};

export const NavMenu = () => {
  const pathname = usePathname();

  return (
    <ul className="navigation">
      {menuData.map((menu) => (
        <li
          key={menu.id}
          className={`${menu.children ? "menu-item-has-children" : ""} ${
            isMenuActive(pathname, menu) ? "active is-active" : ""
          }`.trim()}
        >
          <Link to={menu.link}>{menu.title}</Link>
          {menu.children && (
            <ul className="sub-menu">
              {menu.children.map((child) => (
                <li key={child.id} className={isActive(pathname, child.link) ? "active" : ""}>
                  <Link to={child.link}>{child.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
};

type MobileMenuProps = {
  onNavigate?: () => void;
};

export const MobileMenu = ({ onNavigate }: MobileMenuProps) => {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>({});

  const toggleOpen = (id: number) => {
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ul className="navigation">
      {menuData.map((menu) => (
        <li
          key={menu.id}
          className={`${menu.children ? "menu-item-has-children" : ""} ${
            isMenuActive(pathname, menu) ? "active is-active" : ""
          }`.trim()}
        >
          <Link to={menu.link} onClick={onNavigate}>
            {menu.title}
          </Link>
          {menu.children && (
            <>
              <button
                type="button"
                className={`dropdown-btn ${
                  openMenus[menu.id] ?? isMenuActive(pathname, menu) ? "open" : ""
                }`}
                onClick={() => toggleOpen(menu.id)}
                aria-label={`Toggle ${menu.title} submenu`}
              >
                <span className="plus-line"></span>
              </button>
              <ul style={{ display: openMenus[menu.id] ?? isMenuActive(pathname, menu) ? "block" : "none" }}>
                {menu.children.map((child) => (
                  <li key={child.id} className={isActive(pathname, child.link) ? "active" : ""}>
                    <Link to={child.link} onClick={onNavigate}>
                      {child.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </li>
      ))}
    </ul>
  );
};

export interface MobileSidebarProps {
  isActive: boolean;
  setIsActive: (isActive: boolean) => void;
}

export const MobileSidebar = ({ isActive, setIsActive }: MobileSidebarProps) => {
  return (
    <div className={isActive ? "mobile-menu-visible" : ""}>
      <div className="tgmobile__menu">
        <nav className="tgmobile__menu-box dh-mobile-sidebar">
          <div onClick={() => setIsActive(false)} className="close-btn">
            <i className="tg-flaticon-close-1"></i>
          </div>
          <div className="nav-logo">
            <Link to="/" onClick={() => setIsActive(false)}>
              <Image src={logo} alt="Logo" />
            </Link>
          </div>

          <div className="tgmobile__menu-outer">
            <MobileMenu onNavigate={() => setIsActive(false)} />
          </div>

          <div className="dh-mobile-auth">
            <Link
              to="/apply"
              className="dh-mobile-auth__btn"
              onClick={() => setIsActive(false)}
            >
              Apply Now
            </Link>
          </div>
        </nav>
      </div>
      <div
        className="tgmobile__menu-backdrop"
        onClick={() => setIsActive(false)}
      ></div>
    </div>
  );
};
