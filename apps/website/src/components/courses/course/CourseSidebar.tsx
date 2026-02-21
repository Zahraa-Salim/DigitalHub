// File: src/components/courses/course/CourseSidebar.tsx
// Purpose: UI component responsible for rendering part of the interface (courses/course/CourseSidebar.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import { useState } from "react";

interface CourseSidebarProps {
  courses: any[];
  allCourses: any[];
  setCourses: (courses: any[]) => void;
}

const CourseSidebar = ({ courses, allCourses, setCourses }: CourseSidebarProps) => {
  const [showMoreCategory, setShowMoreCategory] = useState(false);
  const [showMoreSkill, setShowMoreSkill] = useState(false);

  // MULTI SELECT ARRAYS
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // CATEGORY OPTIONS
  const allCategory = [
    "All Category",
    ...Array.from(new Set(allCourses.map((c: any) => c.category?.name).filter(Boolean)))
  ];

  // SKILL OPTIONS
  const allSkill = [
    "All Skill",
    ...Array.from(new Set(allCourses.map((c: any) => c.level).filter(Boolean)))
  ];

  // FILTER FUNCTION
  const applyFilters = (categories: string[], skills: string[]) => {
    let filtered = [...allCourses];

    // CATEGORY FILTER
    if (categories.length > 0) {
      filtered = filtered.filter((c: any) => categories.includes(c.category?.name));
    }

    // SKILL FILTER (multi)
    if (skills.length > 0) {
      filtered = filtered.filter((c: any) => skills.includes(c.level));
    }

    setCourses(filtered);
  };

  // ----------------------------
  // CATEGORY HANDLING (MULTI)
  // ----------------------------
  const handleCategory = (cat: string) => {
    if (cat === "All Category") {
      setSelectedCategories([]); // reset
      applyFilters([], selectedSkills);
      return;
    }

    let updated = [...selectedCategories];

    if (updated.includes(cat)) {
      updated = updated.filter((x) => x !== cat);
    } else {
      updated.push(cat);
    }

    setSelectedCategories(updated);
    applyFilters(updated, selectedSkills);
  };

  const isCategoryChecked = (cat: string) =>
    cat === "All Category"
      ? selectedCategories.length === 0
      : selectedCategories.includes(cat);

  // ----------------------------
  // SKILL HANDLING (MULTI)
  // ----------------------------
  const handleSkill = (skill: string) => {
    if (skill === "All Skill") {
      setSelectedSkills([]); // reset
      applyFilters(selectedCategories, []);
      return;
    }

    let updated = [...selectedSkills];

    if (updated.includes(skill)) {
      updated = updated.filter((x) => x !== skill);
    } else {
      updated.push(skill);
    }

    setSelectedSkills(updated);
    applyFilters(selectedCategories, updated);
  };

  const isSkillChecked = (skill: string) =>
    skill === "All Skill"
      ? selectedSkills.length === 0
      : selectedSkills.includes(skill);

  // SHOW LIMIT
  const categoriesToShow = showMoreCategory ? allCategory : allCategory.slice(0, 8);
  const skillToShow = showMoreSkill ? allSkill : allSkill.slice(0, 4);

  return (
    <div className="col-xl-3 col-lg-4">
      <aside className="courses__sidebar">

        {/* CATEGORY FILTER */}
        <div className="courses-widget">
          <h4 className="widget-title">Categories</h4>
          <div className="courses-cat-list">
            <ul className="list-wrap">
              {categoriesToShow.map((cat, i) => (
                <li key={i}>
                  <div className="form-check" onClick={() => handleCategory(cat)}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      readOnly
                      checked={isCategoryChecked(cat)}
                      id={`cat_${i}`}
                    />
                    <label className="form-check-label" htmlFor={`cat_${i}`}>
                      {cat}
                    </label>
                  </div>
                </li>
              ))}
            </ul>

            <div className="show-more">
              <a
                className={`show-more-btn ${showMoreCategory ? "active" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setShowMoreCategory(!showMoreCategory)}
              >
                {showMoreCategory ? "Show Less -" : "Show More +"}
              </a>
            </div>
          </div>
        </div>

        {/* SKILL FILTER */}
        <div className="courses-widget">
          <h4 className="widget-title">Skill Level</h4>
          <div className="courses-cat-list">
            <ul className="list-wrap">
              {skillToShow.map((skill, i) => (
                <li key={i}>
                  <div className="form-check" onClick={() => handleSkill(skill)}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      readOnly
                      checked={isSkillChecked(skill)}
                      id={`skill_${i}`}
                    />
                    <label className="form-check-label" htmlFor={`skill_${i}`}>
                      {skill}
                    </label>
                  </div>
                </li>
              ))}
            </ul>

            <div className="show-more">
              <a
                className={`show-more-btn ${showMoreSkill ? "active" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => setShowMoreSkill(!showMoreSkill)}
              >
                {showMoreSkill ? "Show Less -" : "Show More +"}
              </a>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CourseSidebar;
