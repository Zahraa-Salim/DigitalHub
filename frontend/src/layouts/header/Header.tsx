// File: frontend/src/layouts/header/Header.tsx
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import useSticky from "@/hooks/useSticky";
import logo from "@/assets/img/logo/digitalhub.png";
import { useEffect, useState } from "react";
import { getPublicPageByKey } from "@/lib/publicApi";
import { MobileSidebar, NavMenu } from "./nav";
import { DEFAULT_MENU_DATA, type MenuItem } from "./navData";

const asText = (value: unknown, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseChildLine = (line: string, fallbackId: string): MenuItem | null => {
  const raw = String(line || "").trim();
  if (!raw) return null;
  const [labelPart, urlPart] = raw.split("|").map((entry) => entry.trim());
  if (!labelPart || !urlPart) return null;
  return { id: fallbackId, title: labelPart, link: urlPart };
};

const parseChildren = (value: unknown, fallbackPrefix: string): MenuItem[] => {
  if (!Array.isArray(value)) return [];
  const direct = value
    .map((entry, index) => {
      if (isRecord(entry)) {
        const label = asText(entry.label ?? entry.title);
        const link = asText(entry.url ?? entry.link);
        if (!label || !link) return null;
        return {
          id: asText(entry.id, `${fallbackPrefix}-${index}`),
          title: label,
          link,
        } satisfies MenuItem;
      }
      if (typeof entry === "string") {
        return parseChildLine(entry, `${fallbackPrefix}-${index}`);
      }
      return null;
    })
    .filter(Boolean) as MenuItem[];
  return direct;
};

const parseMenuItems = (value: unknown): MenuItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!isRecord(entry)) return null;
      const title = asText(entry.label ?? entry.title);
      const link = asText(entry.url ?? entry.link);
      if (!title || !link) return null;
      const id = asText(entry.id, `menu-${index}`);
      const children = parseChildren(entry.children, `${id}-child`);
      return {
        id,
        title,
        link,
        children: children.length ? children : undefined,
      } satisfies MenuItem;
    })
    .filter(Boolean) as MenuItem[];
};

const Header = () => {
  const { sticky } = useSticky();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [primaryCtaLabel, setPrimaryCtaLabel] = useState("Apply Now");
  const [primaryCtaHref, setPrimaryCtaHref] = useState("/apply");
  const [secondaryCtaLabel, setSecondaryCtaLabel] = useState("Hire Talent");
  const [secondaryCtaHref, setSecondaryCtaHref] = useState("/hire-talent");
  const [logoUrl, setLogoUrl] = useState<string>(logo);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_DATA);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const page = await getPublicPageByKey("navbar");
        if (!active) return;

        const content = isRecord(page.content) ? page.content : {};
        const primaryLabel = asText(content.primary_cta_label ?? content.primaryCtaLabel);
        const primaryUrl = asText(content.primary_cta_link ?? content.primary_cta_url ?? content.primaryCtaLink ?? content.primaryCtaUrl);
        const secondaryLabel = asText(content.secondary_cta_label ?? content.hire_cta_label ?? content.secondaryCtaLabel ?? content.hireCtaLabel);
        const secondaryUrl = asText(content.secondary_cta_link ?? content.hire_cta_url ?? content.secondaryCtaLink ?? content.hireCtaUrl);
        const headerLogoUrl = asText(content.logo_url ?? content.logoUrl ?? content.header_logo_url ?? content.headerLogoUrl);
        const parsedMenuItems = parseMenuItems(content.links);

        if (primaryLabel) setPrimaryCtaLabel(primaryLabel);
        if (primaryUrl) setPrimaryCtaHref(primaryUrl);
        if (secondaryLabel) setSecondaryCtaLabel(secondaryLabel);
        if (secondaryUrl) setSecondaryCtaHref(secondaryUrl);
        if (headerLogoUrl) setLogoUrl(headerLogoUrl);
        if (parsedMenuItems.length) setMenuItems(parsedMenuItems);
      } catch {
        // Keep defaults on failure.
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

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
                        <Image src={logoUrl} alt="Logo" />
                      </Link>
                    </div>

                    <div className="tgmenu__navbar-wrap tgmenu__main-menu dh-navbar__center d-none d-lg-flex">
                      <NavMenu items={menuItems} />
                    </div>

                    <div className="tgmenu__action dh-navbar__actions d-none d-lg-flex">
                      <Link to={secondaryCtaHref} className="dh-auth-btn dh-auth-btn--ghost">
                        {secondaryCtaLabel}
                      </Link>
                      <Link to={primaryCtaHref} className="dh-auth-btn dh-auth-btn--special">
                        {primaryCtaLabel}
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

      <MobileSidebar
        isActive={isActive}
        setIsActive={setIsActive}
        logoSrc={logoUrl}
        primaryCtaLabel={primaryCtaLabel}
        primaryCtaHref={primaryCtaHref}
        secondaryCtaLabel={secondaryCtaLabel}
        secondaryCtaHref={secondaryCtaHref}
        menuItems={menuItems}
      />
    </>
  );
};

export default Header;
