"use client";

import Social from "@/components/common/Social";
import FooterCommon from "./FooterCommon";
import { useEffect, useState } from "react";
import Link from "@/components/common/Link";

interface StyleType {
  style?: boolean;
  style_2?: boolean;
}

interface SocialItem {
  name: string;
  url: string;
}

interface FooterData {
  getInTouch: {
    title: string;
    text: string;
    socials?: SocialItem[];
  };
  legal: {
    terms: string;
    privacy: string;
    copyright: string;
  };
}

type PublicHomeResponse = {
  success?: boolean;
  data?: {
    site_settings?: {
      social_links?: Record<string, unknown> | Array<{ name?: string; url?: string }>;
    };
  };
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DEFAULT_DATA: FooterData = {
  getInTouch: {
    title: "Get In Touch",
    text: "Stay connected with The Digital Hub and follow us for the latest updates, events, and learning opportunities.",
    socials: [],
  },
  legal: {
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    copyright: "2026",
  },
};

function normalizeSocialLinks(
  raw: Record<string, unknown> | Array<{ name?: string; url?: string }> | undefined,
): SocialItem[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) => ({ name: String(item?.name || ""), url: String(item?.url || "") }))
      .filter((item) => item.name && item.url);
  }

  return Object.entries(raw)
    .map(([name, url]) => ({ name, url: String(url ?? "") }))
    .filter((item) => item.url);
}

const FooterOne = ({ style, style_2 }: StyleType) => {
  const [data, setData] = useState<FooterData>(DEFAULT_DATA);
  const currentYear = new Date().getFullYear().toString();

  useEffect(() => {
    fetch(`${API_BASE}/public/home`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: PublicHomeResponse | null) => {
        const socials = normalizeSocialLinks(payload?.data?.site_settings?.social_links);
        setData((prev) => ({
          ...prev,
          getInTouch: {
            ...prev.getInTouch,
            socials: socials.length ? socials : prev.getInTouch.socials,
          },
        }));
      })
      .catch(() => {
        // Keep defaults on API failure.
      });
  }, []);

  return (
    <footer
      className={`footer__area ${style_2 ? "footer__area-five" : style ? "footer__area-two" : ""}`}
    >
      <div className={`footer__top ${style_2 ? "footer__top-three" : ""}`}>
        <div className="container">
          <div className="row">
            <FooterCommon />

            <div className="col-xl-3 col-lg-4 col-md-6">
              <div className="footer__widget">
                <h4 className="footer__widget-title">{data.getInTouch.title}</h4>

                <div className="footer__contact-content">
                  <p style={{ whiteSpace: "pre-line" }}>{data.getInTouch.text}</p>

                  <ul className="list-wrap footer__social">
                    <Social socials={data.getInTouch.socials} />
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {style_2 && (
          <div
            className="footer__shape"
            style={{
              backgroundImage: `url(/assets/img/others/h8_footer_shape.svg)`,
            }}
          />
        )}
      </div>

      <div className={`footer__bottom ${style_2 ? "footer__bottom-four" : ""}`}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-7">
              <div className="copy-right-text">
                <p>&copy; {data.legal.copyright || currentYear} The Digital Hub. All rights reserved.</p>
              </div>
            </div>

            <div className="col-md-5">
              <div className="footer__bottom-menu">
                <ul className="list-wrap">
                  <li>
                    <Link to="/contact">{data.legal.terms}</Link>
                  </li>
                  <li>
                    <Link to="/contact">{data.legal.privacy}</Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterOne;
