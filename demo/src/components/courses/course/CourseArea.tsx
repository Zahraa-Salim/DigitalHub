"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import CourseSidebar from "./CourseSidebar";
import CourseTop from "./CourseTop";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function CourseArea() {
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 6;
  const [itemOffset, setItemOffset] = useState(0);

  // Pagination depends on CURRENT filtered courses
  const endOffset = itemOffset + itemsPerPage;
  const currentItems = courses.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(courses.length / itemsPerPage);

  const startOffset = itemOffset + 1;
  const totalItems = courses.length;

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const res = await fetch(`${API}/programs`);
      const data = await res.json();

      // ⬅⬅⬅ IMPORTANT: show data immediately
      setAllCourses(data);
      setCourses(data); // ⬅⬅⬅ HERE IS YOUR FIX

    } catch (err) {
      console.error("Failed to load programs:", err);
    } finally {
      setLoading(false);
    }
  };

  // RESET PAGE WHEN COURSES CHANGE
  useEffect(() => {
    setItemOffset(0);
  }, [courses]);

  const handlePageClick = (event: { selected: number }) => {
    const newOffset = (event.selected * itemsPerPage) % courses.length;
    setItemOffset(newOffset);
  };

  const [activeTab, setActiveTab] = useState(0);
  const handleTabClick = (index: number) => setActiveTab(index);

  if (loading) return <div>Loading...</div>;

  return (
    <section className="all-courses-area section-py-120">
      <div className="container">
        <div className="row">

          {/* SIDEBAR */}
          <CourseSidebar
            courses={courses}
            allCourses={allCourses}
            setCourses={setCourses}
          />

          <div className="col-xl-9 col-lg-8">
            {/* TOP BAR */}
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

              {/* GRID VIEW */}
              <div className={`tab-pane fade ${activeTab === 0 ? "show active" : ""}`} id="grid">
                <div className="row courses__grid-wrap row-cols-1 row-cols-xl-3 row-cols-lg-2 row-cols-md-2 row-cols-sm-1">

                  {currentItems.map((item: any) => (
                    <div key={item.id} className="col">
                      <div className="courses__item shine__animate-item">

                        {/* IMAGE WITH FALLBACK */}
<div className="courses__item-thumb">
  <Link to={`/course-details/${item.id}`} className="shine__animate-link">
    <div className="w-full h-[200px] rounded-lg overflow-hidden bg-gray-100 relative flex items-center justify-center">

      {/* --- LOAD IMAGE ONLY WHEN AVAILABLE --- */}
      {item.imageUrl && (
        <Image
          src={`${API}/uploads/${item.imageUrl}`}
          alt={item.title}
          fill
          className="object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none"; 
            const fallback = e.currentTarget.parentElement?.querySelector(".fallback");
            if (fallback) fallback.classList.remove("hidden");
          }}
        />
      )}

      {/* --- BEAUTIFUL RESPONSIVE FALLBACK --- */}
      <div
        className="fallback hidden absolute inset-0 flex flex-col items-center justify-center bg-gray-50"
      >
        {/* Nice program icon (Book / Learning) */}
        <div className="w-20 h-20 rounded-full border-2 border-indigo-400 flex items-center justify-center shadow-sm bg-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.75c-2.085-1.44-4.665-1.44-6.75 0v10.5c2.085-1.44 4.665-1.44 6.75 0m0-10.5c2.085-1.44 4.665-1.44 6.75 0v10.5c-2.085-1.44-4.665-1.44-6.75 0m0-10.5v10.5"
            />
          </svg>
        </div>

        <span className="mt-3 text-sm font-semibold text-gray-700 text-center px-2">
          {item.title}
        </span>
      </div>

      {/* If no imageUrl → trigger fallback immediately */}
      {!item.imageUrl && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.currentScript.previousElementSibling.classList.remove("hidden");
            `,
          }}
        />
      )}
    </div>
  </Link>
</div>



                        <div className="courses__item-content">
                          <ul className="courses__item-meta list-wrap">
                            <li className="courses__item-tag">
                              <span>{item.category?.name}</span>
                            </li>
                            {/* <li className="avg-rating">
                              <i className="fas fa-star"></i> (No Rating)
                            </li> */}
                          </ul>

                          <h5 className="title">
                            <Link to={`/course-details/${item.id}`}>{item.title}</Link>
                          </h5>

                          <p className="author">Duration: {item.durationLabel}</p>

                          <div className="courses__item-bottom">
                            <div className="button">
                              <Link to={`/course-details/${item.id}`}>
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

                {/* PAGINATION */}
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

              {/* LIST VIEW */}
              <div className={`tab-pane fade ${activeTab === 1 ? "show active" : ""}`} id="list">
                <div className="row courses__list-wrap row-cols-1">
                  {currentItems.map((item: any) => (
                    <div key={item.id} className="col">
                      <div className="courses__item courses__item-three shine__animate-item">
                        <div className="courses__item-thumb">
                          <Image
                            src={`${API}/uploads/${item.imageUrl}`}
                            width={400}
                            height={300}
                            alt={item.title}
                          />
                        </div>

                        <div className="courses__item-content">
                          <ul className="courses__item-meta list-wrap">
                            <li className="courses__item-tag">
                              <span>{item.category?.name}</span>
                            </li>
                            <li className="price">{item.durationLabel}</li>
                          </ul>

                          <h5 className="title">
                            <Link to={`/course-details/${item.id}`}>{item.title}</Link>
                          </h5>

                          <p className="info">{item.shortDescription}</p>

                          <div className="courses__item-bottom">
                            <div className="button">
                              <Link to={`/course-details/${item.id}`}>
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


