// File: frontend/src/layouts/footers/FooterCommon.tsx
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
"use client";

import Link from "@/components/common/Link";
import { useEffect, useState } from "react";
import { getPublicPageByKey } from "@/lib/publicApi";

interface SectionLink {
  label: string;
  url: string;
}

interface Section {
  title: string;
  links: SectionLink[];
}

interface FooterData {
  brand: {
    title: string;
    text: string;
    address: string;
    phone: string;
    logoUrl: string;
  };
  sections: Section[];
}

const DEFAULT_FOOTER: FooterData = {
  brand: {
    title: "The Digital Hub",
    text: "The Digital Hub is a modern learning platform focused on technology, programming, and digital skills.",
    address: "Downtown, Beirut",
    phone: "+961 70639085",
    logoUrl: "/assets/img/logo/logoD.png",
  },
  sections: [
    {
      title: "Useful Links",
      links: [
        { label: "Home", url: "/#header-fixed-height" },
        { label: "Contact", url: "/contact" },
        { label: "About", url: "/about-us" },
      ],
    },
    {
      title: "Our Company",
      links: [
        { label: "Events", url: "/events" },
        { label: "Programs", url: "/programs" },
      ],
    },
  ],
};

const asText = (value: unknown, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseLinks = (value: unknown): SectionLink[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const label = asText(item.label);
      const url = asText(item.url ?? item.link);
      if (!label || !url) return null;
      return { label, url };
    })
    .filter((item): item is SectionLink => Boolean(item));
};

const FooterCommon = () => {
  const [data, setData] = useState<FooterData>(DEFAULT_FOOTER);
  const footerBrandTitle = data.brand.title.replace(/\bDigital\b/, "igital");

  const resolveLinkUrl = (link: SectionLink) => {
    const normalized = link.label.trim().toLowerCase();
    if (normalized === "home") return "/#header-fixed-height";
    if (normalized === "about") return "/about-us";
    return link.url;
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const page = await getPublicPageByKey("footer");
        if (!active) return;

        const content = isRecord(page.content) ? page.content : {};
        const usefulLinks = parseLinks(content.useful_links ?? content.usefulLinks);
        const companyLinks = parseLinks(content.company_links ?? content.companyLinks);

        setData((prev) => ({
          brand: {
            title: asText(content.brand_title ?? content.brandTitle, prev.brand.title),
            text: asText(content.brand_text ?? content.brandText, prev.brand.text),
            address: asText(content.brand_address ?? content.brandAddress, prev.brand.address),
            phone: asText(content.brand_phone ?? content.brandPhone, prev.brand.phone),
            logoUrl: asText(content.brand_logo_url ?? content.brandLogoUrl, prev.brand.logoUrl),
          },
          sections: [
            {
              title: asText(content.useful_links_title ?? content.usefulLinksTitle, prev.sections[0]?.title || "Useful Links"),
              links: usefulLinks.length ? usefulLinks : prev.sections[0]?.links || [],
            },
            {
              title: asText(content.company_links_title ?? content.companyLinksTitle, prev.sections[1]?.title || "Our Company"),
              links: companyLinks.length ? companyLinks : prev.sections[1]?.links || [],
            },
          ],
        }));
      } catch {
        // Keep default footer if API fails.
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="col-xl-3 col-lg-4 col-md-6">
        <div className="footer__widget">
          <div className="logo mb-35">
            <Link to="/" style={{ textDecoration: "none" }}>
              <div className="footer__brand-lockup">
                <img
                  src={data.brand.logoUrl}
                  alt={data.brand.title}
                  className="footer__brand-mark"
                  onError={(e) => {
                    e.currentTarget.src = "/assets/img/logo/logoD.png";
                  }}
                />

                <h4 className="footer__brand-title">{footerBrandTitle}</h4>
              </div>
            </Link>
          </div>

          <div className="footer__content">
            <p>{data.brand.text}</p>
            <ul className="list-wrap">
              <li>{data.brand.address}</li>
              <li>{data.brand.phone}</li>
            </ul>
          </div>
        </div>
      </div>

      {data.sections.map((section, i) => (
        <div key={i} className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="footer__widget">
            <h4 className="footer__widget-title">{section.title}</h4>

            <div className="footer__link">
              <ul className="list-wrap">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link to={resolveLinkUrl(link)}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default FooterCommon;
