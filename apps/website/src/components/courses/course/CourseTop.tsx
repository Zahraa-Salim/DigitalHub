// File: src/components/courses/course/CourseTop.tsx
// Purpose: UI component responsible for rendering part of the interface (courses/course/CourseTop.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";
import { ChangeEvent, useState } from "react";

interface CourseTopProps {
  allCourses: any[];
  startOffset: number;
  endOffset: number;
  totalItems: number;
  setCourses: (courses: any[]) => void;
  handleTabClick: any;
  activeTab: any;
}

interface TitleIcon {
  id: number;
  icon: any;
}

const tab_title: TitleIcon[] = [
  {
    id: 1,
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M4.5 6C4.5 6.55 4.95 7 5.5 7H8.5C9.05 7 9.5 6.55 9.5 6V3C9.5 2.45 9.05 2 8.5 2H5.5C4.95 2 4.5 2.45 4.5 3V6Z" fill="currentColor"/>
        <path d="M10.5 6C10.5 6.55 10.95 7 11.5 7H14.5C15.05 7 15.5 6.55 15.5 6V3C15.5 2.45 15.05 2 14.5 2H11.5C10.95 2 10.5 2.45 10.5 3V6Z" fill="currentColor"/>
        <path d="M4.5 14C4.5 14.55 4.95 15 5.5 15H8.5C9.05 15 9.5 14.55 9.5 14V11C9.5 10.45 9.05 10 8.5 10H5.5C4.95 10 4.5 10.45 4.5 11V14Z" fill="currentColor"/>
        <path d="M10.5 14C10.5 14.55 10.95 15 11.5 15H14.5C15.05 15 15.5 14.55 15.5 14V11C15.5 10.45 15.05 10 14.5 10H11.5C10.95 10 10.5 10.45 10.5 11V14Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 2,
    icon: (
      <svg width="19" height="15" viewBox="0 0 19 15" fill="none">
        <path d="M1.5 6C0.67 6 0 6.67 0 7.5C0 8.33 0.67 9 1.5 9C2.33 9 3 8.33 3 7.5C3 6.67 2.33 6 1.5 6Z" fill="currentColor"/>
        <path d="M1.5 0C0.67 0 0 0.67 0 1.5C0 2.33 0.67 3 1.5 3C2.33 3 3 2.33 3 1.5C3 0.67 2.33 0 1.5 0Z" fill="currentColor"/>
        <path d="M1.5 12C0.67 12 0 12.68 0 13.5C0 14.32 0.68 15 1.5 15C2.32 15 3 14.32 3 13.5C3 12.68 2.33 12 1.5 12Z" fill="currentColor"/>
      </svg>
    ),
  },
];

// 🔥 function to extract numeric duration from "6 Weeks", "3 Months" ...
function getDurationValue(label: string): number {
  if (!label) return 0;

  const num = parseInt(label);

  if (label.toLowerCase().includes("week")) return num;
  if (label.toLowerCase().includes("month")) return num * 4;

  return num;
}

const CourseTop = ({
  allCourses,
  startOffset,
  endOffset,
  totalItems,
  setCourses,
  handleTabClick,
  activeTab,
}: CourseTopProps) => {

  const [selected, setSelected] = useState("");

  const selectHandler = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelected(value);

    let sorted = [...allCourses];

    switch (value) {
      case "":
        sorted = allCourses;
        break;

      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;

      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;

      case "az":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;

      case "za":
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;

      // 🔥 duration working 100%
      case "durationAsc":
        sorted.sort((a, b) =>
          getDurationValue(a.durationLabel) - getDurationValue(b.durationLabel)
        );
        break;

      case "durationDesc":
        sorted.sort((a, b) =>
          getDurationValue(b.durationLabel) - getDurationValue(a.durationLabel)
        );
        break;

      default:
        sorted = allCourses;
    }

    setCourses(sorted);
  };

  return (
    <div className="courses-top-wrap courses-top-wrap">
      <div className="row align-items-center">

        <div className="col-md-5">
          <div className="courses-top-left">
            <p>
              Showing {startOffset}-{endOffset} of {totalItems} Results
            </p>
          </div>
        </div>

        <div className="col-md-7">
          <div className="d-flex justify-content-center justify-content-md-end align-items-center flex-wrap">

            <div className="courses-top-right m-0 ms-md-auto">
              <span className="sort-by">Sort By:</span>

              <div className="courses-top-right-select">
                <select className="orderby" value={selected} onChange={selectHandler}>
                  <option value="">Default sorting</option>
                  <option value="newest">Newest programs</option>
                  <option value="oldest">Oldest programs</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                  <option value="durationAsc">Duration (short → long)</option>
                  <option value="durationDesc">Duration (long → short)</option>
                </select>
              </div>
            </div>

            <ul className="nav nav-tabs courses__nav-tabs">
              {tab_title.map((tab, index) => (
                <li key={index} className="nav-item" onClick={() => handleTabClick(index)}>
                  <button className={`nav-link ${activeTab === index ? "active" : ""}`}>
                    {tab.icon}
                  </button>
                </li>
              ))}
            </ul>

          </div>
        </div>

      </div>
    </div>
  );
};

export default CourseTop;
