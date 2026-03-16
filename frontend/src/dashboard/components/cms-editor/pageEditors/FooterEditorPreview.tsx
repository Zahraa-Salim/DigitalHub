import Social from "@/components/common/Social";
import Link from "@/components/common/Link";
import { useEditor } from "../EditorContext";
import { EditablePageImage } from "../EditablePageImage";
import { EditablePageSpan } from "../EditablePageSpan";

type SocialItem = {
  name: string;
  url: string;
};

const DEFAULT_USEFUL_LINKS: SocialItem[] = [
  { name: "Home", url: "/#header-fixed-height" },
  { name: "Contact", url: "/contact" },
  { name: "About", url: "/about-us" },
];

const DEFAULT_COMPANY_LINKS: SocialItem[] = [
  { name: "Events", url: "/events" },
  { name: "Programs", url: "/programs" },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asText = (value: unknown, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

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

export function FooterEditorPreview() {
  const { pages } = useEditor();
  const footerPage = pages.footer;
  const footerContent = isRecord(footerPage?.local) ? footerPage.local : {};
  const socials = parseSocialLinks(footerContent.social_links ?? footerContent.socialLinks);
  const usefulLinks = parseSocialLinks(footerContent.useful_links ?? footerContent.usefulLinks);
  const companyLinks = parseSocialLinks(footerContent.company_links ?? footerContent.companyLinks);
  const missingPage = !footerPage || footerPage.id === 0;
  const currentYear = new Date().getFullYear().toString();
  const usefulList = usefulLinks.length ? usefulLinks : DEFAULT_USEFUL_LINKS;
  const companyList = companyLinks.length ? companyLinks : DEFAULT_COMPANY_LINKS;

  return (
    <footer className="footer__area">
      {missingPage ? (
        <div className="cms-page-editor" style={{ paddingBottom: 0 }}>
          <p className="cms-page-editor__hint">
            Footer page content is missing in the CMS. Create a page with the key "<em>footer</em>" in CMS &gt; Pages to save edits.
          </p>
        </div>
      ) : null}
      <div className="footer__top">
        <div className="container">
          <div className="row">
            <div className="col-xl-3 col-lg-4 col-md-6">
              <div className="footer__widget">
                <div className="logo mb-35">
                  <div className="footer__brand-lockup">
                    <EditablePageImage
                      pageKey="footer"
                      field="brand_logo_url"
                      fallbackSrc="/assets/img/logo/logoD.png"
                      alt={asText(footerContent.brand_title, "The Digital Hub")}
                      className="footer__brand-mark"
                    />
                  </div>
                </div>

                <div className="footer__content">
                  <p>
                    <EditablePageSpan
                      pageKey="footer"
                      field="brand_text"
                      fallback="The Digital Hub is a modern learning platform focused on technology, programming, and digital skills."
                      multiline
                    />
                  </p>
                  <ul className="list-wrap">
                    <li>
                      <EditablePageSpan
                        pageKey="footer"
                        field="brand_address"
                        fallback="Downtown, Beirut"
                      />
                    </li>
                    <li>
                      <EditablePageSpan
                        pageKey="footer"
                        field="brand_phone"
                        fallback="+961 70639085"
                      />
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
              <div className="footer__widget">
                <h4 className="footer__widget-title">
                  <EditablePageSpan
                    pageKey="footer"
                    field="useful_links_title"
                    fallback="Useful Links"
                  />
                </h4>

                <div className="footer__link">
                  <ul className="list-wrap">
                    {usefulList.map((link, index) => (
                      <li key={`${link.name}-${index}`}>
                        <Link to={link.url} onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
              <div className="footer__widget">
                <h4 className="footer__widget-title">
                  <EditablePageSpan
                    pageKey="footer"
                    field="company_links_title"
                    fallback="Our Company"
                  />
                </h4>

                <div className="footer__link">
                  <ul className="list-wrap">
                    {companyList.map((link, index) => (
                      <li key={`${link.name}-${index}`}>
                        <Link to={link.url} onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-lg-4 col-md-6">
              <div className="footer__widget">
                <h4 className="footer__widget-title">
                  <EditablePageSpan pageKey="footer" field="get_in_touch_title" fallback="Get In Touch" />
                </h4>

                <div className="footer__contact-content">
                  <p style={{ whiteSpace: "pre-line" }}>
                    <EditablePageSpan
                      pageKey="footer"
                      field="get_in_touch_text"
                      fallback="Stay connected with The Digital Hub and follow us for the latest updates, events, and learning opportunities."
                      multiline
                    />
                  </p>

                  <ul className="list-wrap footer__social">
                    <Social socials={socials} />
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-7">
              <div className="copy-right-text">
                <p>
                  &copy; <EditablePageSpan pageKey="footer" field="copyright_text" fallback={currentYear} />{" "}
                  <EditablePageSpan pageKey="footer" field="brand_title" fallback="The Digital Hub" />. All rights reserved.
                </p>
              </div>
            </div>

            <div className="col-md-5">
              <div className="footer__bottom-menu">
                <ul className="list-wrap">
                  <li>
                    <Link to="/terms" onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                      <EditablePageSpan pageKey="footer" field="terms_label" fallback="Terms of Use" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                      <EditablePageSpan pageKey="footer" field="privacy_label" fallback="Privacy Policy" />
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
