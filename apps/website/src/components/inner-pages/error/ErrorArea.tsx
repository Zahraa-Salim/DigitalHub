// File: src/components/inner-pages/error/ErrorArea.tsx
// Purpose: UI component responsible for rendering part of the interface (inner-pages/error/ErrorArea.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
import InjectableSvg from "@/hooks/InjectableSvg"
import BtnArrow from "@/svg/BtnArrow"
import Link from "@/components/common/Link"

const ErrorArea = () => {
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
                        <h2 className="title">ERROR PAGE! <span>Sorry! This Page is Not Available!</span></h2>
                        <div className="tg-button-wrap">
                           <Link to="/" className="btn arrow-btn">Go To Home Page <BtnArrow /></Link>
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


