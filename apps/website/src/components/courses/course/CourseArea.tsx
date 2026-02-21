// File: src/components/courses/course/CourseArea.tsx
// Purpose: UI component responsible for rendering part of the interface (courses/course/CourseArea.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { mockCourses } from "@/data/mock/programCourseMocks";
import CourseSidebar from "./CourseSidebar";
import CourseTop from "./CourseTop";

export default function CourseArea() {
  const [allCourses] = useState(mockCourses);
  const [courses, setCourses] = useState(mockCourses);

  const itemsPerPage = 6;
  const [itemOffset, setItemOffset] = useState(0);

  const endOffset = itemOffset + itemsPerPage;
  const currentItems = courses.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(courses.length / itemsPerPage);

  const totalItems = courses.length;
  const startOffset = totalItems === 0 ? 0 : itemOffset + 1;

  useEffect(() => {
    setItemOffset(0);
  }, [courses]);

  const handlePageClick = (event: { selected: number }) => {
    if (courses.length === 0) {
      setItemOffset(0);
      return;
    }
    const newOffset = (event.selected * itemsPerPage) % courses.length;
    setItemOffset(newOffset);
  };

  const [activeTab, setActiveTab] = useState(0);
  const handleTabClick = (index: number) => setActiveTab(index);

  return (
    <section className="all-courses-area section-py-120">
      <div className="container">
        <div className="row">
          <CourseSidebar courses={courses} allCourses={allCourses} setCourses={setCourses} />

          <div className="col-xl-9 col-lg-8">
            <CourseTop
              allCourses={allCourses}
              startOffset={startOffset}
              endOffset={Math.min(endOffset, totalItems)}
              totalItems={totalItems}
              setCourses={setCourses}
              handleTabClick={handleTabClick}
              activeTab={activeTab}
            />

            <div className="tab-content" id="myTabContent">
              <div
                className={`tab-pane fade ${activeTab === 0 ? "show active" : ""}`}
                id="grid"
              >
                <div className="row courses__grid-wrap row-cols-1 row-cols-xl-3 row-cols-lg-2 row-cols-md-2 row-cols-sm-1">
                  {currentItems.map((item) => (
                    <div key={item.id} className="col">
                      <div className="courses__item shine__animate-item">
                        <div className="courses__item-thumb">
                          <Link to="/courses" className="shine__animate-link">
                            <Image src={item.thumb} alt={item.title} />
                          </Link>
                        </div>

                        <div className="courses__item-content">
                          <ul className="courses__item-meta list-wrap">
                            <li className="courses__item-tag">
                              <span>{item.category.name}</span>
                            </li>
                          </ul>

                          <h5 className="title">
                            <Link to="/courses">{item.title}</Link>
                          </h5>

                          <p className="author">Duration: {item.durationLabel}</p>

                          <div className="courses__item-bottom">
                            <div className="button">
                              <Link to="/courses">
                                <span className="text">View Program</span>
                                <i className="flaticon-arrow-right"></i>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {currentItems.length === 0 && (
                    <div className="col-12">
                      <p>No programs available right now.</p>
                    </div>
                  )}
                </div>

                <nav className="pagination__wrap mt-30">
                  <ReactPaginate
                    breakLabel="..."
                    onPageChange={handlePageClick}
                    pageRangeDisplayed={3}
                    pageCount={pageCount}
                    className="list-wrap"
                  />
                </nav>
              </div>

              <div
                className={`tab-pane fade ${activeTab === 1 ? "show active" : ""}`}
                id="list"
              >
                <div className="row courses__list-wrap row-cols-1">
                  {currentItems.map((item) => (
                    <div key={item.id} className="col">
                      <div className="courses__item courses__item-three shine__animate-item">
                        <div className="courses__item-thumb">
                          <Image src={item.thumb} width={400} height={300} alt={item.title} />
                        </div>

                        <div className="courses__item-content">
                          <ul className="courses__item-meta list-wrap">
                            <li className="courses__item-tag">
                              <span>{item.category.name}</span>
                            </li>
                            <li className="price">{item.durationLabel}</li>
                          </ul>

                          <h5 className="title">
                            <Link to="/courses">{item.title}</Link>
                          </h5>

                          <p className="info">{item.shortDescription}</p>

                          <div className="courses__item-bottom">
                            <div className="button">
                              <Link to="/courses">
                                <span className="text">View Program</span>
                                <i className="flaticon-arrow-right"></i>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


