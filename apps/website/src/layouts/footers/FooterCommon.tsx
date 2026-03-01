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

const FooterCommon = () => {
  const [data, setData] = useState<FooterData>(DEFAULT_FOOTER);

  const resolveLinkUrl = (link: SectionLink) => {
    const normalized = link.label.trim().toLowerCase();
    if (normalized === "home") return "/#header-fixed-height";
    if (normalized === "about") return "/#home-about";
    return link.url;
  };

  useEffect(() => {
    fetch(`${API_BASE}/public/home`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: PublicHomeResponse | null) => {
        if (!payload?.data?.site_settings) return;

        const contactInfo = payload.data.site_settings.contact_info || {};
        setData((prev) => ({
          ...prev,
          brand: {
            ...prev.brand,
            title: String(payload.data?.site_settings?.site_name || prev.brand.title),
            address: String(contactInfo.address ?? prev.brand.address),
            phone: String(contactInfo.phone ?? prev.brand.phone),
          },
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
