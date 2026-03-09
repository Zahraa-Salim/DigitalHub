// File: src/components/common/breadcrumb/BreadcrumbOne.tsx
// Purpose: UI component responsible for rendering part of the interface (common/breadcrumb/BreadcrumbOne.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import SvgAnimation from "@/hooks/SvgAnimation";

import shape_1 from "@/assets/img/others/breadcrumb_shape01.svg";
import shape_2 from "@/assets/img/others/breadcrumb_shape02.svg";
import shape_3 from "@/assets/img/others/breadcrumb_shape03.svg";
import shape_4 from "@/assets/img/others/breadcrumb_shape04.svg";

type BreadcrumbOneProps = {
  title: string;
  sub_title: string;
};

const BreadcrumbOne = ({ title, sub_title }: BreadcrumbOneProps) => {
  const svgIconRef = SvgAnimation("/assets/img/others/breadcrumb_shape05.svg");

  return (
    <section
      className="breadcrumb__area breadcrumb__bg tg-motion-effects"
      style={{ backgroundImage: "url(/assets/img/bg/breadcrumb_bg.jpg)" }}
    >
      <div className="container">
        <div className="row">
          <div className="col-xl-6 col-lg-8">
            <div className="breadcrumb__content">
              <h3 className="title">{title}</h3>
              <nav className="breadcrumb">
                <span>
                  <Link to="/">Home</Link>
                </span>
                <span className="breadcrumb-separator">
                  <i className="fas fa-angle-right"></i>
                </span>
                <span>{sub_title}</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="breadcrumb__shape-wrap tg-svg" ref={svgIconRef}>
        <Image src={shape_1} alt="shape" className="alltuchtopdown tg-motion-effects1" />
        <Image src={shape_2} alt="shape" className="rotateme tg-motion-effects2" />
        <Image src={shape_3} alt="shape" className="alltuchtopdown tg-motion-effects3" />
        <Image src={shape_4} alt="shape" className="rotateme tg-motion-effects4" />
        <span
          className="svg-icon breadcrumb-line tg-motion-effects5"
          data-svg-icon="/assets/img/others/breadcrumb_shape05.svg"
        ></span>
      </div>
    </section>
  );
};

export default BreadcrumbOne;
