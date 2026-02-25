// File: src/layouts/footers/FooterOne.tsx
// Purpose: Shared layout container used across pages and sections.
// If you change this file: Changing structure or wrapper logic can affect navigation, shared UI placement, and consistency across routes.
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
  id: string;
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

/* ================= DEFAULT DATA ================= */
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
/* ================================================= */

const FooterOne = ({ style, style_2 }: StyleType) => {
  const [data, setData] = useState<FooterData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false); // ✅ FIX

  useEffect(() => {
    fetch("http://localhost:3000/footer", { cache: "no-store" })
      .then((res) => res.json())
      .then((res) => {
        if (res) setData(res);
      })
      .catch(() => {})
      .finally(() => setLoaded(true)); // ✅ FIX
  }, []);

  // ⛔ Prevent default flash on refresh
  if (!loaded) return null;

  return (
    <footer
      className={`footer__area ${
        style_2 ? "footer__area-five" : style ? "footer__area-two" : ""
      }`}
    >
      <div className={`footer__top ${style_2 ? "footer__top-three" : ""}`}>
        <div className="container">
          <div className="row">
            {/* LEFT PART */}
            <FooterCommon />

            {/* GET IN TOUCH */}
            <div className="col-xl-3 col-lg-4 col-md-6">
              <div className="footer__widget">
                <h4 className="footer__widget-title">
                  {data.getInTouch.title}
                </h4>

                <div className="footer__contact-content">
                  <p style={{ whiteSpace: "pre-line" }}>
                    {data.getInTouch.text}
                  </p>

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

      {/* BOTTOM */}
      <div className={`footer__bottom ${style_2 ? "footer__bottom-four" : ""}`}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-7">
              <div className="copy-right-text">
                <p>
                  © {data.legal.copyright} The Digital Hub. All rights reserved.
                </p>
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


