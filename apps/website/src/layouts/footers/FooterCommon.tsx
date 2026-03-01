// File: src/layouts/footers/FooterCommon.tsx
// Purpose: Shared layout container used across pages and sections.
// If you change this file: Changing structure or wrapper logic can affect navigation, shared UI placement, and consistency across routes.
"use client";

import Link from "@/components/common/Link";
import { useEffect, useState } from "react";

/* ================= TYPES ================= */

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

/* ================= DEFAULT DATA ================= */

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
        { label: "Home", url: "/" },
        { label: "Contact", url: "/contact" },
        { label: "About", url: "/about" },
        { label: "Blog", url: "/blog" },
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

/* ================= CONFIG ================= */

const API_BASE = "http://localhost:3000";

/* ================= COMPONENT ================= */

const FooterCommon = () => {
  const [data, setData] = useState<FooterData>(DEFAULT_FOOTER);

  useEffect(() => {
    fetch(`${API_BASE}/footer`, { cache: "no-store" })
      .then((res) => res.json())
      .then((res) => {
        if (!res) return;

        setData({
          brand: {
            ...DEFAULT_FOOTER.brand,
            ...res.brand,
            logoUrl:
              res.brand?.logoUrl && res.brand.logoUrl !== ""
                ? res.brand.logoUrl.startsWith("http")
                  ? res.brand.logoUrl
                  : `${API_BASE}${res.brand.logoUrl}`
                : DEFAULT_FOOTER.brand.logoUrl,
          },
          sections:
            Array.isArray(res.sections) && res.sections.length > 0
              ? res.sections
              : DEFAULT_FOOTER.sections,
        });
      })
      .catch(() => {
        // Keep default footer if API fails
      });
  }, []);

  return (
    <>
      {/* ================= BRAND ================= */}
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
                    e.currentTarget.src =
                      "/assets/img/logo/secondary_logo.svg";
                  }}
                />

                <h4 style={{ color: "#fff", margin: 0 }}>
                  {data.brand.title}
                </h4>
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

      {/* ================= SECTIONS ================= */}
      {data.sections.map((section, i) => (
        <div
          key={i}
          className="col-xl-3 col-lg-4 col-md-6 col-sm-6"
        >
          <div className="footer__widget">
            <h4 className="footer__widget-title">{section.title}</h4>

            <div className="footer__link">
              <ul className="list-wrap">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <Link to={link.url}>{link.label}</Link>
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


