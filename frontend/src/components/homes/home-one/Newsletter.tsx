// File: frontend/src/components/homes/home-one/Newsletter.tsx
// Purpose: Renders the newsletter/subscribe UI block for the frontend.

"use client"
import { lazy, Suspense, useState, type FormEvent } from "react";
import Image from "@/components/common/Image"
import { getCmsString } from "@/lib/cmsContent";
import { resolveCmsImage } from "@/lib/cmsImageResolver";

import newsletter_img1 from "@/assets/img/others/newsletter_img.png"
import newsletter_img2 from "@/assets/img/others/newsletter_shape01.png"
import newsletter_img3 from "@/assets/img/others/newsletter_shape02.png"
import newsletter_img4 from "@/assets/img/others/newsletter_shape03.png"

const SubscribeModal = lazy(() => import("@/components/inner-pages/subscribe/SubscribeModal"));

type NewsletterProps = {
  content?: Record<string, unknown> | null;
}

const Newsletter = ({ content }: NewsletterProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [phone, setPhone] = useState("");

  const imageRegistry = {
    "newsletter_img.png":     newsletter_img1,
    "newsletter_shape01.png": newsletter_img2,
    "newsletter_shape02.png": newsletter_img3,
    "newsletter_shape03.png": newsletter_img4,
  } as const;

  const titlePrefix             = getCmsString(content, ["title_prefix",             "titlePrefix"],             "Want to stay");
  const titleHighlight          = getCmsString(content, ["title_highlight",           "titleHighlight"],          "informed");
  const titleSuffix             = getCmsString(content, ["title_suffix",              "titleSuffix"],             "about");
  const titleSecondLinePrefix    = getCmsString(content, ["title_second_line_prefix",    "titleSecondLinePrefix"],    "new");
  const titleSecondLineHighlight = getCmsString(content, ["title_second_line_highlight", "titleSecondLineHighlight"], "courses & updates?");
  const inputPlaceholder         = getCmsString(content, ["input_placeholder",          "inputPlaceholder"],         "Your phone number");
  const buttonText              = getCmsString(content, ["button_text",               "buttonText"],              "Subscribe Now");
  const imageMain     = resolveCmsImage(getCmsString(content, ["main_image_url",      "mainImageUrl"],     ""), imageRegistry, newsletter_img1);
  const imageShapeOne = resolveCmsImage(getCmsString(content, ["shape_one_image_url", "shapeOneImageUrl"], ""), imageRegistry, newsletter_img2);
  const imageShapeTwo = resolveCmsImage(getCmsString(content, ["shape_two_image_url", "shapeTwoImageUrl"], ""), imageRegistry, newsletter_img3);
  const imageShapeBg  = resolveCmsImage(getCmsString(content, ["shape_bg_image_url",  "shapeBgImageUrl"],  ""), imageRegistry, newsletter_img4);

  const openModal = (event: FormEvent) => {
    event.preventDefault();
    setModalOpen(true);
  };

  return (
    <>
      <section className="newsletter__area">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-4">
              <div className="newsletter__img-wrap">
                <Image src={imageMain}     alt="img" />
                <Image src={imageShapeOne} alt="img" data-aos="fade-up" data-aos-delay="400" />
                <Image src={imageShapeTwo} alt="img" className="alltuchtopdown" />
              </div>
            </div>
            <div className="col-lg-8">
              <div className="newsletter__content">
                <h2 className="title">
                  {titlePrefix} <span>{titleHighlight}</span> {titleSuffix}
                  <br />
                  {titleSecondLinePrefix} <span>{titleSecondLineHighlight}</span>
                </h2>
                <div className="newsletter__form">
                  <form onSubmit={openModal}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder={inputPlaceholder}
                    />
                    <button
                      type="submit"
                      className="btn"
                    >
                      {buttonText}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="newsletter__shape">
          <Image src={imageShapeBg} alt="img" data-aos="fade-left" data-aos-delay="400" />
        </div>
      </section>

      {modalOpen && (
        <Suspense fallback={null}>
          <SubscribeModal initialPhone={phone} onClose={() => setModalOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default Newsletter;
