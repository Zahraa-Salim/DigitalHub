"use client";

import Social from "@/components/common/Social";
import FooterCommon from "./FooterCommon";
import { useEffect, useState } from "react";
import Link from "@/components/common/Link";
import { getPublicPageByKey } from "@/lib/publicApi";

interface StyleType {
  style?: boolean;
  style_2?: boolean;
}

interface SocialItem {
  name: string;
  url: string;
}

interface FooterData {
  siteName: string;
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

const DEFAULT_DATA: FooterData = {
  siteName: "The Digital Hub",
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

const asText = (value: unknown, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseSocialLinks = (value: unknown): SocialItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const name = asText(entry.name ?? entry.label);
      const url = asText(entry.url ?? entry.link);
      if (!name || !url) return null;
      return { name, url };
    })
    .filter((entry): entry is SocialItem => Boolean(entry));
};

const FooterOne = ({ style, style_2 }: StyleType) => {
  const [data, setData] = useState<FooterData>(DEFAULT_DATA);
  const currentYear = new Date().getFullYear().toString();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const page = await getPublicPageByKey("footer");
        if (!active) return;
        const content = isRecord(page.content) ? page.content : {};
        const socials = parseSocialLinks(content.social_links ?? content.socialLinks);

        setData((prev) => ({
          siteName: asText(content.brand_title ?? content.brandTitle, prev.siteName),
          getInTouch: {
            title: asText(content.get_in_touch_title ?? content.getInTouchTitle, prev.getInTouch.title),
            text: asText(content.get_in_touch_text ?? content.getInTouchText, prev.getInTouch.text),
            socials: socials.length ? socials : prev.getInTouch.socials,
          },
          legal: {
            terms: asText(content.terms_label ?? content.termsLabel, prev.legal.terms),
            privacy: asText(content.privacy_label ?? content.privacyLabel, prev.legal.privacy),
            copyright: asText(content.copyright_text ?? content.copyrightText, prev.legal.copyright),
          },
        }));
      } catch {
        // Keep defaults on API failure.
      }
    };

    void load();
    return () => {
      active = false;
    };
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

        {style_2 ? (
          <div
            className="footer__shape"
            style={{
              backgroundImage: "url(/assets/img/others/h8_footer_shape.svg)",
            }}
          />
        ) : null}
      </div>

      <div className={`footer__bottom ${style_2 ? "footer__bottom-four" : ""}`}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-7">
              <div className="copy-right-text">
                <p>
                  &copy; {data.legal.copyright || currentYear} {data.siteName}. All rights reserved.
                </p>
              </div>
            </div>

            <div className="col-md-5">
              <div className="footer__bottom-menu">
                <ul className="list-wrap">
                  <li>
                    <Link to="/terms">{data.legal.terms}</Link>
                  </li>
                  <li>
                    <Link to="/privacy">{data.legal.privacy}</Link>
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
