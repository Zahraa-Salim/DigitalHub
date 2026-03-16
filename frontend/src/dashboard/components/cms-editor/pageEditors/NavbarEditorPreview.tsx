import Link from "@/components/common/Link";
import logo from "@/assets/img/logo/digitalhub.png";
import { DEFAULT_MENU_DATA, type MenuItem } from "@/layouts/header/navData";
import { useEditor } from "../EditorContext";
import { EditablePageImage } from "../EditablePageImage";
import { EditablePageSpan } from "../EditablePageSpan";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asText = (value: unknown, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const parseMenuItems = (value: unknown): MenuItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!isRecord(entry)) return null;
      const title = asText(entry.label ?? entry.title);
      const link = asText(entry.url ?? entry.link, "#");
      if (!title) return null;
      const children = Array.isArray(entry.children)
        ? entry.children
            .map((child, childIndex) => {
              if (!isRecord(child)) return null;
              const childTitle = asText(child.label ?? child.title);
              const childLink = asText(child.url ?? child.link, "#");
              if (!childTitle) return null;
              return {
                id: asText(child.id, `child-${index}-${childIndex}`),
                title: childTitle,
                link: childLink,
              } satisfies MenuItem;
            })
            .filter(Boolean) as MenuItem[]
        : undefined;

      return {
        id: asText(entry.id, `menu-${index}`),
        title,
        link,
        children: children?.length ? children : undefined,
      } satisfies MenuItem;
    })
    .filter(Boolean) as MenuItem[];
};

const toPreviewImage = (value: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return undefined;
  if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("/")) {
    return normalized;
  }
  return `/${normalized.replace(/^\/+/, "")}`;
};

export function NavbarEditorPreview() {
  const { pages } = useEditor();
  const navbarPage = pages.navbar;
  const navbarContent = isRecord(navbarPage?.local) ? navbarPage.local : {};
  const menuItems = parseMenuItems(navbarContent.links);
  const visibleMenu = menuItems.length ? menuItems : DEFAULT_MENU_DATA;
  const missingPage = !navbarPage || navbarPage.id === 0;
  const previewLogo = toPreviewImage(asText(navbarContent.logo_url ?? navbarContent.logoUrl));

  return (
    <div className="cms-page-preview-navbar">
      {missingPage ? (
        <div className="cms-page-editor" style={{ paddingBottom: 0 }}>
          <p className="cms-page-editor__hint">
            Navbar page content is missing in the CMS. Create a page with the key "<em>navbar</em>" in CMS &gt; Pages to save edits.
          </p>
        </div>
      ) : null}
      <header>
        <div className="tg-header__area dh-navbar">
          <div className="container custom-container">
            <div className="row">
              <div className="col-12">
                <div className="tgmenu__wrap">
                  <nav className="tgmenu__nav dh-navbar__inner">
                    <div className="logo dh-navbar__logo">
                      <Link to="/" onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                        <EditablePageImage
                          pageKey="navbar"
                          field="logo_url"
                          fallbackSrc={logo}
                          previewSrc={previewLogo}
                          alt="Logo"
                        />
                      </Link>
                    </div>

                    <div className="tgmenu__navbar-wrap tgmenu__main-menu dh-navbar__center d-none d-lg-flex">
                      <ul className="navigation">
                        {visibleMenu.map((item) => (
                          <li key={item.id} className={item.children?.length ? "menu-item-has-children" : ""}>
                            <Link to={item.link} onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                              {item.title}
                            </Link>
                            {item.children?.length ? (
                              <ul className="sub-menu">
                                {item.children.map((child) => (
                                  <li key={child.id}>
                                    <Link to={child.link} onClick={(event) => event.preventDefault()} style={{ pointerEvents: "auto" }}>
                                      {child.title}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="tgmenu__action dh-navbar__actions d-none d-lg-flex">
                      <Link
                        to={asText(navbarContent.secondary_cta_link, "/hire-talent")}
                        className="dh-auth-btn dh-auth-btn--ghost"
                        onClick={(event) => event.preventDefault()}
                        style={{ pointerEvents: "auto" }}
                      >
                        <EditablePageSpan pageKey="navbar" field="secondary_cta_label" fallback="Hire Talent" />
                      </Link>
                      <Link
                        to={asText(navbarContent.primary_cta_link, "/apply")}
                        className="dh-auth-btn dh-auth-btn--special"
                        onClick={(event) => event.preventDefault()}
                        style={{ pointerEvents: "auto" }}
                      >
                        <EditablePageSpan pageKey="navbar" field="primary_cta_label" fallback="Apply Now" />
                      </Link>
                    </div>

                    <button
                      type="button"
                      className="mobile-nav-toggler d-lg-none dh-mobile-toggler"
                      aria-label="Menu preview disabled"
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
    </div>
  );
}
