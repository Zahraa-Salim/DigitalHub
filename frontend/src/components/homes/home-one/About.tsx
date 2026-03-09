// File: frontend/src/components/homes/home-one/About.tsx
// What this code does:
// 1) Defines reusable UI components used across pages.
// 2) Renders props-driven sections and interactive elements.
// 3) Encapsulates local UI behavior and presentation details.
// 4) Provides building blocks for higher-level page composition.
"use client"
import Image, { VideoPopup } from "@/components/common/Image"
import Link from "@/components/common/Link"
import { useState } from "react";
import BtnArrow from "@/svg/BtnArrow";
import { getCmsString, getCmsStringArray } from "@/lib/cmsContent";
import { resolveCmsImage } from "@/lib/cmsImageResolver";

import about_img1 from "@/assets/img/others/about_img.png"
import about_img2 from "@/assets/img/others/about_shape.svg"

type AboutProps = {
  content?: Record<string, unknown> | null;
};

const defaultBulletPoints = [
  "Job-ready web and digital training",
  "Hands-on projects with mentor support",
  "Career preparation for real opportunities",
];

const About = ({ content }: AboutProps) => {
   const imageRegistry = {
      "about_img.png": about_img1,
      "about_shape.svg": about_img2,
   } as const;

   const [isVideoOpen, setIsVideoOpen] = useState(false);
   const subtitle = getCmsString(content, ["subtitle", "sub_title"], "About The Digital Hub");
   const title = getCmsString(content, ["title", "heading"], "Empowering Youth with Practical Digital Skills");
   const description = getCmsString(
      content,
      ["description", "body"],
      "The Digital Hub helps youth build practical digital skills through guided training, mentorship, and real projects that connect learning to work."
   );
   const bulletPoints = getCmsStringArray(content, ["bullet_points", "bullets"], defaultBulletPoints);
   const ctaText = getCmsString(content, ["cta_text", "button_text"], "Learn More About Us");
   const ctaLink = getCmsString(content, ["cta_link", "button_link"], "/about-us");
   const mainImage = resolveCmsImage(getCmsString(content, ["main_image_url", "mainImageUrl"], ""), imageRegistry, about_img1);
   const shapeImage = resolveCmsImage(getCmsString(content, ["shape_image_url", "shapeImageUrl"], ""), imageRegistry, about_img2);

   return (
      <>
         <section id="home-about" className="about-area tg-motion-effects section-py-120">
            <div className="container">
               <div className="row align-items-center justify-content-center">
                  <div className="col-lg-6 col-md-9">
                     <div className="about__images">
                        <Image src={mainImage} alt="img" className="main-img" />
                        <Image src={shapeImage} alt="img" className="shape alltuchtopdown" />
                     </div>
                  </div>

                  <div className="col-lg-6">
  <div className="about__content">
    <div className="section__title">
      <span className="sub-title">{subtitle}</span>
      <h2 className="title">{title}</h2>
    </div>

    <p className="desc">{description}</p>

    <ul className="about__info-list list-wrap">
      {bulletPoints.slice(0, 4).map((point, idx) => (
        <li key={`${point}-${idx}`} className="about__info-list-item">
          <i className="flaticon-angle-right"></i>
          <p className="content">{point}</p>
        </li>
      ))}
    </ul>

    <div className="tg-button-wrap">
      <Link to={ctaLink} className="btn arrow-btn">
        {ctaText} <BtnArrow />
      </Link>
    </div>
  </div>
</div>

               </div>
            </div>
         </section>
         {/* video modal start */}
         <VideoPopup
            isOpen={isVideoOpen}
            onClose={() => setIsVideoOpen(false)}
            videoId="b2Az7_lLh3g"
         />
         {/* video modal end */}
      </>
   )
}

export default About


