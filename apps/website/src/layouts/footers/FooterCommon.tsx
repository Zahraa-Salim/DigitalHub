"use client";

import Link from "@/components/common/Link";
import { useEffect, useState } from "react";

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

type PublicHomeResponse = {
  success?: boolean;
  data?: {
    site_settings?: {
      site_name?: string;
      contact_info?: Record<string, unknown>;
    };
  };
};

const DEFAULT_FOOTER: FooterData = {
  brand: {
    title: "The Digital Hub",
    text: "The Digital Hub is a modern learning platform focused on technology, programming, and digital skills.",
    address: "Downtown, Beirut",
    phone: "+961 70639085",
    logoUrl: "/assets/img/logo/preloader.svg",
  },
  sections: [
    {
      title: "Useful Links",
      links: [
        { label: "Home", url: "/#header-fixed-height" },
        { label: "Contact", url: "/contact" },
        { label: "About", url: "/#home-about" },
      ],
    },
    {
      title: "Our Company",
      links: [
        { label: "Events", url: "/events" },
        { label: "Courses", url: "/courses" },
      ],
    },
  ],
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const pickString = (source: Record<string, unknown>, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = String(source[key] ?? "").trim();
    if (value) return value;
  }
  return fallback;
};

const parseLinks = (value: unknown): SectionLink[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const source = item as Record<string, unknown>;
      const label = String(source.label ?? "").trim();
      const url = String(source.url ?? "").trim();
      if (!label || !url) return null;
      return { label, url };
    })
    .filter((item): item is SectionLink => Boolean(item));
};

const FooterCommon = () => {
  const [data, setData] = useState<FooterData>(DEFAULT_FOOTER);

  const resolveLinkUrl = (link: SectionLink) => {
    const normalized = link.label.trim().toLowerCase();
    if (normalized === "home") return "/#header-fixed-height";
    if (normalized === "about") return "/#home-about";
    return link.url;
  };

  useEffect(() => {
    fetch(`${API_BASE}/public/home`, { cache: "no-store", credentials: "omit" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: PublicHomeResponse | null) => {
        if (!payload?.data?.site_settings) return;

        const contactInfo = payload.data.site_settings.contact_info || {};
        const usefulLinks = parseLinks(contactInfo.footer_useful_links);
        const companyLinks = parseLinks(contactInfo.footer_company_links);

        setData((prev) => ({
          brand: {
            title: String(payload.data?.site_settings?.site_name || prev.brand.title),
            text: pickString(contactInfo, ["footer_brand_text", "brand_text"], prev.brand.text),
            address: pickString(contactInfo, ["address"], prev.brand.address),
            phone: pickString(contactInfo, ["phone"], prev.brand.phone),
            logoUrl: pickString(contactInfo, ["footer_logo_url", "logo_url"], prev.brand.logoUrl),
          },
          sections: [
            {
              title: pickString(
                contactInfo,
                ["footer_useful_links_title", "useful_links_title"],
                prev.sections[0]?.title || "Useful Links",
              ),
              links: usefulLinks.length ? usefulLinks : prev.sections[0]?.links || [],
            },
            {
              title: pickString(
                contactInfo,
                ["footer_company_links_title", "company_links_title"],
                prev.sections[1]?.title || "Our Company",
              ),
              links: companyLinks.length ? companyLinks : prev.sections[1]?.links || [],
            },
          ],
        }));
      })
      .catch(() => {
        // Keep default footer if API fails.
      });
  }, []);

  return (
    <>
      <div className="col-xl-3 col-lg-4 col-md-6">
        <div className="footer__widget">
          <div className="logo mb-35">
            <Link to="/" style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <img
                  src={data.brand.logoUrl}
                  alt={data.brand.title}
                  style={{ width: 40, height: "auto" }}
                  onError={(e) => {
                    e.currentTarget.src = "/assets/img/logo/secondary_logo.svg";
                  }}
                />

                <h4 style={{ color: "#fff", margin: 0 }}>{data.brand.title}</h4>
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
