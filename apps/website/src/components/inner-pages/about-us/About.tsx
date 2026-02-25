// File: src/components/inner-pages/about-us/About.tsx
// Purpose: UI component responsible for rendering part of the interface (inner-pages/about-us/About.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";

import aboutHeroImage from "@/assets/img/others/inner_about_img.png";
import aboutAltImage from "@/assets/img/others/about_img.png";

const valueCards = [
  {
    title: "Mission",
    text: "Bridge students to real-world careers with practical tracks and guided mentorship.",
  },
  {
    title: "Vision",
    text: "Become the most trusted launchpad for future-ready digital talent in our region.",
  },
  {
    title: "Impact",
    text: "Build confident creators who can learn, build, and lead with measurable outcomes.",
  },
];

const featureList = [
  "Project-based programs led by industry professionals",
  "Career readiness: portfolio, interview prep, and teamwork",
  "Flexible learning paths for different skill levels",
];

const About = () => {
  return (
    <section className="dh-about-legend section-py-120">
      <div className="container">
        <div className="dh-about-legend__hero">
          <div className="dh-about-legend__media">
            <div className="dh-about-legend__media-main">
              <Image src={aboutHeroImage} alt="The Digital Hub students collaborating" />
            </div>
            <div className="dh-about-legend__floating dh-about-legend__floating--top">
              <p className="number">15K+</p>
              <p className="label">Active Learners</p>
            </div>
            <div className="dh-about-legend__floating dh-about-legend__floating--bottom">
              <p className="number">92%</p>
              <p className="label">Program Completion Rate</p>
            </div>
          </div>

          <div className="dh-about-legend__content">
            <span className="dh-about-legend__tag">About The Digital Hub</span>
            <h2 className="title">
              We Build Future-Ready Professionals Through
              <span>Applied Learning</span>
            </h2>
            <p className="desc">
              The Digital Hub is where ambition meets direction. We combine guided
              instruction, team-based projects, and mentorship so learners graduate with
              practical skills, confidence, and a portfolio that speaks for itself.
            </p>

            <ul className="dh-about-legend__list list-wrap">
              {featureList.map((item) => (
                <li key={item}>
                  <span className="icon">
                    <i className="flaticon-angle-right"></i>
                  </span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>

            <div className="dh-about-legend__cta">
              <Link to="/contact" className="btn arrow-btn">
                Talk To Our Team <BtnArrow />
              </Link>
              <Link to="/courses" className="ghost-btn">
                Explore Programs
              </Link>
            </div>
          </div>
        </div>

        <div className="dh-about-legend__values">
          <div className="dh-about-legend__values-media">
            <Image src={aboutAltImage} alt="Students learning at The Digital Hub" />
          </div>
          <div className="dh-about-legend__values-grid">
            {valueCards.map((item) => (
              <article key={item.title} className="dh-about-legend__value-card">
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;


