// File: src/layouts/header/nav.tsx
// Purpose: Shared layout container used across pages and sections.
// If you change this file: Changing structure or wrapper logic can affect navigation, shared UI placement, and consistency across routes.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { usePathname } from "@/utils/navigation";

import logo from "@/assets/img/logo/digitalhub.png";

type MenuItem = {
  id: number;
  title: string;
  link: string;
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
  },
  {
    id: 4,
    title: "Participants",
    link: "/participants",
  },
  {
    id: 5,
    title: "Team",
    link: "/team",
  },
  {
    id: 6,
    title: "Contact",
    link: "/contact",
  },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const NavMenu = () => {
  const pathname = usePathname();

  return (
    <ul className="navigation">
      {menuData.map((menu) => (
        <li
          key={menu.id}
          className={isActive(pathname, menu.link) ? "active is-active" : ""}
        >
          <Link to={menu.link}>{menu.title}</Link>
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

  return (
    <ul className="navigation">
      {menuData.map((menu) => (
        <li
          key={menu.id}
          className={isActive(pathname, menu.link) ? "active is-active" : ""}
        >
          <Link to={menu.link} onClick={onNavigate}>
            {menu.title}
          </Link>
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
              to="/contact"
              className="dh-mobile-auth__btn"
              onClick={() => setIsActive(false)}
            >
              Contact
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
