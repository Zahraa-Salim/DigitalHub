// File: frontend/src/components/inner-pages/privacy/TermsPage.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
"use client";

import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsString } from "@/lib/cmsContent";

const DEFAULT_TITLE = "Terms of Use";
const DEFAULT_TEXT =
  "These are placeholder terms of use. Use the Pages editor in the dashboard to publish your official terms and conditions.";

const TermsPage = () => {
  const page = useCmsPage("terms");
  const content = page?.content ?? null;

  const title = getCmsString(content, ["title", "heading"], DEFAULT_TITLE);
  const body = getCmsString(content, ["text", "body", "content"], DEFAULT_TEXT);
  const lastUpdatedLabel = getCmsString(content, ["last_updated_label", "lastUpdatedLabel"], "Last updated");

  return (
    <section className="dh-legal-page section-py-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <article className="dh-legal-page__card">
              <h1 className="dh-legal-page__title">{title}</h1>
              <p className="dh-legal-page__meta">
                {page?.updated_at ? `${lastUpdatedLabel}: ${new Date(page.updated_at).toLocaleDateString()}` : null}
              </p>
              <div className="dh-legal-page__body">
                {body.split(/\n{2,}/g).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TermsPage;
