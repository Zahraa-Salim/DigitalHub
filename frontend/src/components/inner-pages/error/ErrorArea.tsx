// File: src/components/inner-pages/error/ErrorArea.tsx
// Purpose: UI component responsible for rendering part of the interface (inner-pages/error/ErrorArea.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
import InjectableSvg from "@/hooks/InjectableSvg"
import BtnArrow from "@/svg/BtnArrow"
import Link from "@/components/common/Link"
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsString } from "@/lib/cmsContent";

const ErrorArea = () => {
   const page = useCmsPage("not_found");
   const content = page?.content ?? null;
   const title = getCmsString(content, ["title", "hero_title", "heroTitle"], "ERROR PAGE!");
   const subtitle = getCmsString(content, ["subtitle", "hero_subtitle", "heroSubtitle"], "Sorry! This Page is Not Available!");
   const buttonText = getCmsString(content, ["button_text", "buttonText", "cta_text", "ctaText"], "Go To Home Page");

   return (
      <section className="error-area">
         <div className="container">
            <div className="row justify-content-center">
               <div className="col-lg-8">
                  <div className="error-wrap text-center">
                     <div className="error-img">
                        <InjectableSvg src="assets/img/others/error_img.svg" alt="img" className="injectable" />
                     </div>
                     <div className="error-content">
                        <h2 className="title">{title} <span>{subtitle}</span></h2>
                        <div className="tg-button-wrap">
                           <Link to="/" className="btn arrow-btn">{buttonText} <BtnArrow /></Link>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>
   )
}

export default ErrorArea


