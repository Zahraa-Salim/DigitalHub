// File: src/components/homes/home-one/Banner.tsx
// Purpose: UI component responsible for rendering part of the interface (homes/home-one/Banner.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
'use client';
import React from 'react';
import Image from '@/components/common/Image';
import Link from '@/components/common/Link';
import SvgAnimation from '@/hooks/SvgAnimation';
import BtnArrow from '@/svg/BtnArrow';

import banner_img_1 from '@/assets/img/banner/banner_img.png';
import banner_shape_1 from '@/assets/img/banner/banner_shape01.png';
import banner_shape_2 from '@/assets/img/banner/banner_shape02.png';
import banner_shape_3 from '@/assets/img/banner/banner_shape01.svg';
import banner_shape_4 from '@/assets/img/banner/banner_shape02.svg';
import banner_icon_1 from '@/assets/img/banner/bg_dots.svg';
import banner_author_1 from '@/assets/img/banner/banner_author01.png';
import banner_author_2 from '@/assets/img/banner/banner_author02.png';

const Banner: React.FC = () => {

   const svgIconRef = SvgAnimation('/assets/img/objects/title_shape.svg');

   return (
      <section
         className="banner-area banner-bg tg-motion-effects"
         style={{ backgroundImage: `url(/assets/img/banner/banner_bg.png)` }}
      >
         <div className="container">
            <div className="row justify-content-between align-items-start">
               <div className="col-xl-5 col-lg-6">
                  <div className="banner__content">
                     <h3
                        className="title tg-svg"
                        data-aos="fade-right"
                        data-aos-delay="400"
                        ref={svgIconRef}
                     >
                        Build Your
                       <span className="position-relative" style={{ marginLeft: "10px" }}>
  <span className="svg-icon"></span>

  <svg
    x="0px"
    y="0px"
    preserveAspectRatio="none"
    viewBox="0 0 209 59"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.74438 7.70565C69.7006 -1.18799 136.097 -2.38304 203.934 4.1205C207.178 4.48495 209.422 7.14626 208.933 10.0534C206.793 23.6481 205.415 36.5704 204.801 48.8204C204.756 51.3291 202.246 53.5582 199.213 53.7955C136.093 59.7623 74.1922 60.5985 13.5091 56.3043C10.5653 56.0924 7.84371 53.7277 7.42158 51.0325C5.20725 38.2627 2.76333 25.6511 0.0898448 13.1978C-0.465589 10.5873 1.61173 8.1379 4.73327 7.70565"
      fill="#0255E0"
    />
  </svg>

  Digital Skills
</span>

                        <br />
                        For Work, Freelancing, and the{" "}
                        <b>Digital Economy</b>
                     </h3>

                     <p data-aos="fade-right" data-aos-delay="600">
                        The Digital Hub by UNRWA equips youth with job-ready digital literacy and
                        web development skills through hands-on training, mentorship, and
                        real-world projects—bridging learning to employment.
                     </p>

                     <div className="banner__btn-wrap" data-aos="fade-right" data-aos-delay="800">
                        <Link to="/contact" className="btn arrow-btn">
                           Get in Touch <BtnArrow />
                        </Link>
                     </div>
                  </div>
               </div>

               <div className="col-lg-6">
                  <div className="banner__images">
                     <Image src={banner_img_1} alt="img" className="main-img" />
                     <div className="shape big-shape" data-aos="fade-up-right" data-aos-delay="600">
                        <Image src={banner_shape_1} alt="shape" className="tg-motion-effects1" />
                     </div>
                     <Image src={banner_icon_1} alt="shape" className="shape bg-dots rotateme" />
                     <Image src={banner_shape_2} alt="shape" className="shape small-shape tg-motion-effects3" />

                     <div className="banner__author">
                        <div className="banner__author-item">
                          
                           <h6 className="name">Hands-on Training</h6>
                        </div>

                        <div className="banner__author-item">
                           
                           <h6 className="name">Mentorship & Projects</h6>
                        </div>

                        <Image src={banner_shape_4} alt="shape" className="arrow-shape tg-motion-effects3" />
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <Image src={banner_shape_3} alt="shape" className="line-shape" data-aos="fade-right" data-aos-delay="1600" />
      </section>
   );
};

export default Banner;


