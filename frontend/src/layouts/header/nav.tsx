// File: frontend/src/layouts/header/nav.tsx
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { usePathname } from "@/utils/navigation";
import { useState, type TouchEvent } from "react";
import { DEFAULT_MENU_DATA, type MenuItem } from "./navData";

import logo from "@/assets/img/logo/digitalhub.png";

const isActive = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

const isMenuActive = (pathname: string, item: MenuItem) => {
  if (isActive(pathname, item.link)) return true;
  if (!item.children) return false;
  return item.children.some((child) => isActive(pathname, child.link));
};

export const NavMenu = ({ items = DEFAULT_MENU_DATA }: { items?: MenuItem[] }) => {
  const pathname = usePathname();

  return (
    <ul className="navigation">
      {items.map((menu) => (
        <li
          key={menu.id}
          className={`${menu.children?.length ? "menu-item-has-children" : ""} ${
            isMenuActive(pathname, menu) ? "active is-active" : ""
          }`.trim()}
        >
          <Link to={menu.link}>{menu.title}</Link>
          {menu.children?.length ? (
            <ul className="sub-menu">
              {menu.children.map((child) => (
                <li key={child.id} className={isActive(pathname, child.link) ? "active" : ""}>
                  <Link to={child.link}>{child.title}</Link>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

type MobileMenuProps = {
  items?: MenuItem[];
  onNavigate?: () => void;
};

export const MobileMenu = ({ items = DEFAULT_MENU_DATA, onNavigate }: MobileMenuProps) => {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleOpen = (id: string) => {
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ul className="navigation">
      {items.map((menu) => {
        const isOpen = openMenus[menu.id] ?? isMenuActive(pathname, menu);
        return (
          <li
            key={menu.id}
            className={`${menu.children?.length ? "menu-item-has-children" : ""} ${
              isMenuActive(pathname, menu) ? "active is-active" : ""
            }`.trim()}
          >
            <Link to={menu.link} onClick={onNavigate}>
              {menu.title}
            </Link>
            {menu.children?.length ? (
              <>
                <button
                  type="button"
                  className={`dropdown-btn ${isOpen ? "open" : ""}`}
                  onClick={() => toggleOpen(menu.id)}
                  aria-label={`Toggle ${menu.title} submenu`}
                  aria-expanded={isOpen}
                >
                  <span className="dropdown-chevron" aria-hidden="true"></span>
                </button>
                <ul style={{ display: isOpen ? "block" : "none" }}>
                  {menu.children.map((child) => (
                    <li key={child.id} className={isActive(pathname, child.link) ? "active" : ""}>
                      <Link to={child.link} onClick={onNavigate}>
                        {child.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export interface MobileSidebarProps {
  isActive: boolean;
  setIsActive: (isActive: boolean) => void;
  logoSrc?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  menuItems?: MenuItem[];
}

export const MobileSidebar = ({
  isActive,
  setIsActive,
  logoSrc = logo,
  primaryCtaLabel = "Apply Now",
  primaryCtaHref = "/apply",
  secondaryCtaLabel = "Hire Talent",
  secondaryCtaHref = "/hire-talent",
  menuItems = DEFAULT_MENU_DATA,
}: MobileSidebarProps) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null);
  };
  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    if (endX - touchStartX > 70) {
      setIsActive(false);
    }
    setTouchStartX(null);
  };

  return (
    <div className={isActive ? "mobile-menu-visible" : ""}>
      <div className="tgmobile__menu">
        <nav
          className="tgmobile__menu-box dh-mobile-sidebar"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div onClick={() => setIsActive(false)} className="close-btn">
            <i className="tg-flaticon-close-1"></i>
          </div>
          <div className="nav-logo">
            <Link to="/" onClick={() => setIsActive(false)}>
              <Image src={logoSrc} alt="Logo" />
            </Link>
          </div>

          <div className="tgmobile__menu-outer">
            <MobileMenu items={menuItems} onNavigate={() => setIsActive(false)} />
          </div>

          <div className="dh-mobile-auth">
            <div className="dh-mobile-auth__grid">
              <Link
                to={secondaryCtaHref}
                className="dh-mobile-auth__btn dh-mobile-auth__btn--secondary"
                onClick={() => setIsActive(false)}
              >
                <span className="dh-mobile-auth__btn-label">{secondaryCtaLabel}</span>
              </Link>
              <Link
                to={primaryCtaHref}
                className="dh-mobile-auth__btn"
                onClick={() => setIsActive(false)}
              >
                <span className="dh-mobile-auth__btn-label">{primaryCtaLabel}</span>
              </Link>
            </div>
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
