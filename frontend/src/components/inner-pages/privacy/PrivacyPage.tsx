"use client";

import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsString } from "@/lib/cmsContent";

const DEFAULT_TITLE = "Privacy Policy";
const DEFAULT_TEXT =
  "This is a demo privacy policy. Replace this text with your official policy using the Pages editor in the dashboard.";

const PrivacyPage = () => {
  const page = useCmsPage("privacy");
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

export default PrivacyPage;
