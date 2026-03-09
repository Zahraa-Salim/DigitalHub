// File: src/components/homes/home-one/InstructorTwo.tsx
// Purpose: UI component responsible for rendering part of the interface (homes/home-one/InstructorTwo.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client"
import Image from "@/components/common/Image";
import type { StaticImageData } from "@/components/common/Image";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";
import SvgAnimation from '@/hooks/SvgAnimation';
import InjectableSvg from "@/hooks/InjectableSvg";
import { getCmsRecord, getCmsString } from "@/lib/cmsContent";
import { resolveCmsImage } from "@/lib/cmsImageResolver";

import instructor_thumb1 from "@/assets/img/instructor/instructor_two01.png"
import instructor_thumb2 from "@/assets/img/instructor/instructor_two02.png"

interface StyleType{
   style?:boolean;
   content?: Record<string, unknown> | null;
}

type CtaCard = {
   title: string;
   description: string;
   buttonText: string;
   buttonLink: string;
   image: StaticImageData | string;
};

const resolveStaticImage = (value: unknown) => {
   if (typeof value === "string") return value;
   if (value && typeof value === "object" && "src" in value) {
      const src = (value as { src?: unknown }).src;
      return typeof src === "string" ? src : "";
   }
   return "";
};

const normalizeLegacyCtaTitle = (value: string, fallback: string) => {
   const normalized = String(value || "").trim().toLowerCase();
   if (!normalized) return fallback;
   if (normalized === "become a instructor") return "Become a Mentor";
   if (normalized === "become a student") return "Become a Participant";
   return value;
};

const InstructorTwo = ({ style, content }: StyleType) => {
   const imageRegistry = {
      "instructor_two01.png": instructor_thumb1,
      "instructor_two02.png": instructor_thumb2,
   } as const;

   const svgIconRef = SvgAnimation('/assets/img/instructor/instructor_shape02.svg');
   const svgIconRef2 = SvgAnimation('/assets/img/instructor/instructor_shape02.svg');
   const leftContent = getCmsRecord(content, ["left", "left_card"]);
   const rightContent = getCmsRecord(content, ["right", "right_card"]);
   const leftCard: CtaCard = {
      title: normalizeLegacyCtaTitle(getCmsString(leftContent, ["title"], "Become a Mentor"), "Become a Mentor"),
      description: getCmsString(
         leftContent,
         ["description", "body"],
         "To take a trivial example, which of us undertakes physical exercise yes is this happen here."
      ),
      buttonText: getCmsString(leftContent, ["button_text", "cta_text"], "Apply Now"),
      buttonLink: getCmsString(leftContent, ["button_link", "cta_link"], "/apply?program=Full%20Stack%20Development"),
      image: resolveCmsImage(getCmsString(leftContent, ["image_url"], ""), imageRegistry, resolveStaticImage(instructor_thumb1)),
   };
   const rightCard: CtaCard = {
      title: normalizeLegacyCtaTitle(getCmsString(rightContent, ["title"], "Become a Participant"), "Become a Participant"),
      description: getCmsString(
         rightContent,
         ["description", "body"],
         "Join millions of people from around the world learning together. Online learning"
      ),
      buttonText: getCmsString(rightContent, ["button_text", "cta_text"], "Apply Now"),
      buttonLink: getCmsString(rightContent, ["button_link", "cta_link"], "/apply?program=UI%2FUX%20Design"),
      image: resolveCmsImage(getCmsString(rightContent, ["image_url"], ""), imageRegistry, resolveStaticImage(instructor_thumb2)),
   };

   return (
      <section className={`${style ? "instructor__area-four" : "instructor__area-two"}`}>
         <div className="container">
            <div className="instructor__item-wrap-two">
               <div className="row">
                  <div className="col-xl-6">
                     <div className="instructor__item-two tg-svg" ref={svgIconRef}>
                        <div className="instructor__thumb-two">
                           <Image src={leftCard.image} alt="img" />
                           <div className="shape-one">
                              <InjectableSvg src="/assets/img/instructor/instructor_shape01.svg" alt="img" className="injectable" />
                           </div>
                           <div className="shape-two">
                              <span className="svg-icon"></span>
                           </div>
                        </div>
                        <div className="instructor__content-two">
                           <h3 className="title"><Link to={leftCard.buttonLink}>{leftCard.title}</Link></h3>
                           <p>{leftCard.description}</p>
                           <div className="tg-button-wrap">
                              <Link to={leftCard.buttonLink} className="btn arrow-btn">{leftCard.buttonText} <BtnArrow /></Link>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="col-xl-6">
                     <div className="instructor__item-two tg-svg" ref={svgIconRef2}>
                        <div className="instructor__thumb-two">
                           <Image src={rightCard.image} alt="img" />
                           <div className="shape-one">
                              <InjectableSvg src="/assets/img/instructor/instructor_shape01.svg" alt="img" className="injectable" />
                           </div>
                           <div className="shape-two">
                              <span className="svg-icon"></span>
                           </div>
                        </div>
                        <div className="instructor__content-two">
                           <h3 className="title"><Link to={rightCard.buttonLink}>{rightCard.title}</Link></h3>
                           <p>{rightCard.description}</p>
                           <div className="tg-button-wrap">
                              <Link to={rightCard.buttonLink} className="btn arrow-btn">{rightCard.buttonText} <BtnArrow /></Link>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>
   )
}

export default InstructorTwo


