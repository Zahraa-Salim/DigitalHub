// File: src/components/homes/home-one/CourseArea.tsx
// Purpose: UI component responsible for rendering part of the interface (homes/home-one/CourseArea.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import { useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { mockCategories, mockCourses } from "@/data/mock/programCourseMocks";

interface StyleType {
  style?: boolean;
}

const setting = {
  slidesPerView: 4,
  loop: true,
  spaceBetween: 30,
  observer: true,
  observeParents: true,
  autoplay: false,
  navigation: {
    nextEl: ".courses-button-next",
    prevEl: ".courses-button-prev",
  },
  breakpoints: {
    1500: { slidesPerView: 4 },
    1200: { slidesPerView: 4 },
    992: { slidesPerView: 3, spaceBetween: 24 },
    768: { slidesPerView: 2, spaceBetween: 24 },
    576: { slidesPerView: 1 },
    0: { slidesPerView: 1 },
  },
};

export default function CourseArea({ style }: StyleType) {
  const [activeTab, setActiveTab] = useState(0);

  const programs = useMemo(() => mockCourses.slice(0, 12), []);
  const categories = useMemo(
    () => mockCategories.filter((cat) => programs.some((p) => p.category.id === cat.id)),
    [programs]
  );

  const filteredPrograms =
    activeTab === 0
      ? programs
      : programs.filter((p) => p.category.id === categories[activeTab - 1]?.id);

  return (
    <section
      className={`courses-area ${style ? "section-py-120" : "section-pt-120 section-pb-90"}`}
      style={{ backgroundImage: "url(/assets/img/bg/courses_bg.jpg)" }}
    >
      <div className="container">
        <div className="section__title-wrap">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="section__title text-center mb-40">
                <span className="sub-title">Top Class Courses</span>
                <h2 className="title">Explore Our World's Best Courses</h2>
                <p className="desc">When known printer took a galley of type scrambl edmake</p>
              </div>

              <div className="courses__nav">
                <ul className="nav nav-tabs">
                  <li onClick={() => setActiveTab(0)} className="nav-item">
                    <button className={`nav-link ${activeTab === 0 ? "active" : ""}`}>
                      All Courses
                    </button>
                  </li>

                  {categories.map((cat, index) => (
                    <li key={cat.id} onClick={() => setActiveTab(index + 1)} className="nav-item">
                      <button className={`nav-link ${activeTab === index + 1 ? "active" : ""}`}>
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <Swiper {...setting} modules={[Autoplay, Navigation]} className="swiper courses-swiper-active">
          {filteredPrograms.map((item) => (
            <SwiperSlide key={item.id}>
              <div className="courses__item shine__animate-item">
                <div className="courses__item-thumb">
                  <Link to="/courses" className="shine__animate-link">
                    <Image src={item.thumb} alt={item.title} />
                  </Link>
                </div>

                <div className="courses__item-content">
                  <ul className="courses__item-meta list-wrap">
                    <li className="courses__item-tag">
                      <Link to="#">{item.category.name}</Link>
                    </li>
                  </ul>

                  <h5 className="title">
                    <Link to="/courses">{item.title}</Link>
                  </h5>

                  <p className="author">
                    By <Link to="#">{item.instructorName || "Our Team"}</Link>
                  </p>

                  <div className="courses__item-bottom">
                    <div className="button">
                      <Link to="/courses">
                        <span className="text">Enroll Now</span>
                        <i className="flaticon-arrow-right"></i>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {!style && (
          <div className="courses__nav">
            <div className="courses-button-prev">
              <i className="flaticon-arrow-right"></i>
            </div>
            <div
              className="courses-button-next"
              onClick={() => document.querySelector<HTMLDivElement>(".courses-button-prev")?.click()}
            >
              <i className="flaticon-arrow-right"></i>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


