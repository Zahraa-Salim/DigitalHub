// frontend/website/components/courses/course-details/CourseDetailsArea.tsx
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useState } from "react";

import Overview from "./Overview";
import Sidebar from "./Sidebar";
import Curriculum from "./Curriculum";
import Reviews from "./Reviews";
import Instructors from "./Instructors";

import course_details_img1 from "@/assets/img/courses/courses_details.jpg";
import course_details_img2 from "@/assets/img/courses/course_author001.png";

const tab_title: string[] = ["Overview", "Curriculum", "Instructors", "reviews"];

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

type CourseDetailsAreaProps = {
  program?: any;
};

const CourseDetailsArea = ({ program }: CourseDetailsAreaProps) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
  };


  const hasImage = !!program?.imageUrl;
  const imageUrl = hasImage
    ? `${API}/uploads/${String(program.imageUrl).replace(/^\/+/, "")}`
    : null;

  return (
    <section className="courses__details-area section-py-120">
      <div className="container">
        <div className="row">
          <div className="col-xl-9 col-lg-8">
            <div className="courses__details-thumb">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={program.title}
                  width={1000}
                  height={600}
                />
              ) : (
                <Image src={course_details_img1} alt="img" />
              )}
            </div>

            <div className="courses__details-content">
              <ul className="courses__item-meta list-wrap">
                <li className="courses__item-tag">
                  <Link to="/courses">
                    {program?.category?.name || "Development"}
                  </Link>
                </li>
                {/* <li className="avg-rating">
                  <i className="fas fa-star"></i>
             
                  (No Rating)
                </li> */}
              </ul>

              <h2 className="title">
                {program?.title ||
                  "Resolving Conflicts Between Designers And Engineers"}
              </h2>

              <div className="courses__details-meta">
                <ul className="list-wrap">
                  <li className="author-two">
                    <Image src={course_details_img2} alt="img" />
                    By{" "}
                    <Link to="#">
                   
                      Digital Hub Team
                    </Link>
                  </li>
                  <li className="date">
                    <i className="flaticon-calendar"></i>
                    {program?.durationLabel
                      ? `Duration: ${program.durationLabel}`
                      : "Duration: N/A"}
                  </li>
                  <li>
                    <i className="flaticon-mortarboard"></i>
                    Level: {program?.level || "N/A"}
                  </li>
                </ul>
              </div>

              <ul className="nav nav-tabs" id="myTab" role="tablist">
                {tab_title.map((tab, index) => (
                  <li
                    key={index}
                    onClick={() => handleTabClick(index)}
                    className="nav-item"
                    role="presentation"
                  >
                    <button
                      className={`nav-link ${
                        activeTab === index ? "active" : ""
                      }`}
                    >
                      {tab}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="tab-content" id="myTabContent">
                <div
                  className={`tab-pane fade ${
                    activeTab === 0 ? "show active" : ""
                  }`}
                  id="overview-tab-pane"
                  role="tabpanel"
                  aria-labelledby="overview-tab"
                >
                  <Overview program={program} />
                </div>

                <div
                  className={`tab-pane fade ${
                    activeTab === 1 ? "show active" : ""
                  }`}
                  id="curriculum-tab-pane"
                  role="tabpanel"
                  aria-labelledby="curriculum-tab"
                >
                  <Curriculum />
                </div>

                <div
                  className={`tab-pane fade ${
                    activeTab === 2 ? "show active" : ""
                  }`}
                  id="instructors-tab-pane"
                  role="tabpanel"
                  aria-labelledby="instructors-tab"
                >
                  <Instructors />
                </div>

                <div
                  className={`tab-pane fade ${
                    activeTab === 3 ? "show active" : ""
                  }`}
                  id="reviews-tab-pane"
                  role="tabpanel"
                  aria-labelledby="reviews-tab"
                >
                  <Reviews />
                </div>
              </div>
            </div>
          </div>


          <Sidebar />
        </div>
      </div>
    </section>
  );
};

export default CourseDetailsArea;


