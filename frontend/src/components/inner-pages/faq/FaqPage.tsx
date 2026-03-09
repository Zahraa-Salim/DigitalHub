"use client";

import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsRecordArray, getCmsString } from "@/lib/cmsContent";

const DEFAULT_TITLE = "Frequently Asked Questions";
const DEFAULT_DESCRIPTION =
  "Find quick answers about programs, admissions, and how to get in touch with The Digital Hub team.";

const FaqPage = () => {
  const page = useCmsPage("faq");
  const content = page?.content ?? null;

  const title = getCmsString(content, ["title", "heading", "hero_title", "heroTitle"], DEFAULT_TITLE);
  const description = getCmsString(
    content,
    ["description", "subtitle", "hero_subtitle", "heroSubtitle"],
    DEFAULT_DESCRIPTION,
  );
  const items = getCmsRecordArray(content, ["items"]);

  return (
    <section className="dh-faq-page section-py-120">
      <div className="container">
        <div className="row justify-content-center mb-40">
          <div className="col-lg-8 text-center">
            <h1 className="dh-faq-page__title">{title}</h1>
            {description ? <p className="dh-faq-page__description">{description}</p> : null}
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            {items.length === 0 ? (
              <p className="dh-faq-page__empty">
                {getCmsString(content, ["empty_state_text", "emptyStateText"], "No questions have been published yet.")}
              </p>
            ) : (
              <div className="dh-faq-page__list">
                {items.map((item, index) => {
                  const question = getCmsString(item, ["question", "title"], "");
                  const answer = getCmsString(item, ["answer", "description", "text"], "");
                  if (!question && !answer) return null;
                  return (
                    <article key={index} className="dh-faq-page__item">
                      {question ? <h3 className="dh-faq-page__question">{question}</h3> : null}
                      {answer ? <p className="dh-faq-page__answer">{answer}</p> : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FaqPage;

