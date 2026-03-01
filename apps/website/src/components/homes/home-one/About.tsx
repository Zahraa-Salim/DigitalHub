// File: src/components/homes/home-one/About.tsx
// Purpose: UI component responsible for rendering part of the interface (homes/home-one/About.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client"
import Image, { VideoPopup } from "@/components/common/Image"
import Link from "@/components/common/Link"
import { useState } from "react";
import BtnArrow from "@/svg/BtnArrow";

import about_img1 from "@/assets/img/others/about_img.png"
import about_img2 from "@/assets/img/others/about_shape.svg"
import about_img3 from "@/assets/img/others/student_grp.png"

const About = () => {

   const [isVideoOpen, setIsVideoOpen] = useState(false);

   return (
      <>
         <section className="about-area tg-motion-effects section-py-120">
            <div className="container">
               <div className="row align-items-center justify-content-center">
                  <div className="col-lg-6 col-md-9">
                     <div className="about__images">
                        <Image src={about_img1} alt="img" className="main-img" />
                        <Image src={about_img2} alt="img" className="shape alltuchtopdown" />
                      
                        <div className="about__enrolled" data-aos="fade-right" data-aos-delay="200">
                         
                      
                        </div>
                     </div>
                  </div>

                  <div className="col-lg-6">
  <div className="about__content">
    <div className="section__title">
      <span className="sub-title">About The Digital Hub</span>
      <h2 className="title">
        Empowering Youth with
        
          Digital Skills
        
        for Today’s Job Market
      </h2>
    </div>

    <p className="desc">
      The Digital Hub by UNRWA is a learning and innovation space designed to equip
      youth with in-demand digital skills. Through hands-on training, mentorship,
      and real-world projects, we connect education to employment and prepare
      learners for success in the digital economy.
    </p>

    <ul className="about__info-list list-wrap">
      <li className="about__info-list-item">
        <i className="flaticon-angle-right"></i>
        <p className="content">Job-Ready Digital & Web Development Programs</p>
      </li>
      <li className="about__info-list-item">
        <i className="flaticon-angle-right"></i>
        <p className="content">Practical Training, Mentorship & Project-Based Learning</p>
      </li>
      <li className="about__info-list-item">
        <i className="flaticon-angle-right"></i>
        <p className="content">Career Readiness & Job Market Integration</p>
      </li>
      <li className="about__info-list-item">
        <i className="flaticon-angle-right"></i>
        <p className="content">Community Learning, Innovation & Youth Empowerment</p>
      </li>
    </ul>

    <div className="tg-button-wrap">
      <Link to="/about-us" className="btn arrow-btn">
        Learn More About Us <BtnArrow />
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


