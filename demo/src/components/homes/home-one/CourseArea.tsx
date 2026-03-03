"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import Image from "@/components/common/Image";
import Link from "@/components/common/Link";

const API = "http://localhost:3000";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Program {
  id: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  author?: string;
  categoryId: number;
  category: Category;
}

interface StyleType {
  style?: boolean;
}

const DEFAULT_IMAGES: Record<string, string> = {
  "Digital Marketing": "/assets/img/programs/marketing.jpg",
  "Cyber Security": "/assets/img/programs/cyber.jpg",
  "Cloud Computing": "/assets/img/programs/cloud.jpg",
  "Data Science": "/assets/img/programs/data.jpg",
  default: "/assets/img/programs/default.jpg",
};

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
    "1500": { slidesPerView: 4 },
    "1200": { slidesPerView: 4 },
    "992": { slidesPerView: 3, spaceBetween: 24 },
    "768": { slidesPerView: 2, spaceBetween: 24 },
    "576": { slidesPerView: 1 },
    "0": { slidesPerView: 1 },
  },
};

export default function CourseArea({ style }: StyleType) {
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, progRes] = await Promise.all([
          fetch(`${API}/program-categories`, { cache: "no-store" }),
          fetch(`${API}/programs`, { cache: "no-store" }),
        ]);

        const catJson = await catRes.json();
        const progJson = await progRes.json();

        setCategories(catJson.categories || catJson || []);
        setPrograms(progJson.programs || progJson || []);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredPrograms =
    activeTab === 0
      ? programs
      : programs.filter((p) => p.categoryId === categories[activeTab - 1]?.id);

  const buildImageUrl = (item: Program) => {
    if (item.imageUrl) return `${API}/uploads/${item.imageUrl}`;
    return DEFAULT_IMAGES[item.category?.name] || DEFAULT_IMAGES.default;
  };

  if (loading) {
    return (
      <section className="section-pt-120 section-pb-90">
        <div className="container text-center">
          <div className="skeleton-card"></div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`courses-area ${
        style ? "section-py-120" : "section-pt-120 section-pb-90"
      }`}
      style={{ backgroundImage: `url(/assets/img/bg/courses_bg.jpg )` }}
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

              {/* TABS */}
              <div className="courses__nav">
                <ul className="nav nav-tabs">
                  <li onClick={() => setActiveTab(0)} className="nav-item">
                    <button className={`nav-link ${activeTab === 0 ? "active" : ""}`}>
                      All Courses
                    </button>
                  </li>

                  {categories.map((cat, index) => (
                    <li
                      key={cat.id}
                      onClick={() => setActiveTab(index + 1)}
                      className="nav-item"
                    >
                      <button
                        className={`nav-link ${activeTab === index + 1 ? "active" : ""}`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Courses */}
        <Swiper {...setting} modules={[Autoplay, Navigation]} className="swiper courses-swiper-active">
          {filteredPrograms.map((item) => (
            <SwiperSlide key={item.id}>
              <div className="courses__item shine__animate-item">
                
                {/* --- IMAGE AREA FIXED & CLEAN --- */}
                <div className="courses__item-thumb">
                  <Link to={`/course-details/${item.slug}`} className="shine__animate-link">
                    <div className="w-full h-[200px] rounded-lg overflow-hidden bg-gray-100 relative flex items-center justify-center">

                      <Image
                        src={buildImageUrl(item)}
                        alt={item.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.parentElement?.querySelector(".fallback");
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                      />

                      {/* FALLBACK */}
                      <div className="fallback hidden flex-col items-center justify-center text-gray-600">
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-300 to-blue-300 flex items-center justify-center shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white"
                            fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M3 16.5V7.5C3 6.12 4.12 5 5.5 5h13C19.88 5 21 6.12 21 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-13C4.12 19 3 17.88 3 16.5zm3-6h.01M9 10.5h6M9 14h6"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium mt-2">Program</span>
                      </div>

                    </div>
                  </Link>
                </div>

                {/* CONTENT */}
                <div className="courses__item-content">
                  <ul className="courses__item-meta list-wrap">
                    <li className="courses__item-tag">
                      <Link to="#">{item.category?.name}</Link>
                    </li>
                  </ul>

                  <h5 className="title">
                    <Link to={`/course-details/${item.slug}`}>{item.title}</Link>
                  </h5>

                  <p className="author">
                    By <Link to="#">{item.author || "Our Team"}</Link>
                  </p>

                  <div className="courses__item-bottom">
                    <div className="button">
                      <Link to={`/course-details/${item.id}`}>
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
            <div className="courses-button-prev"><i className="flaticon-arrow-right"></i></div>
            <div className="courses-button-next"><i className="flaticon-arrow-right"></i></div>
          </div>
        )}

      </div>
    </section>
  );
}


