// File: frontend/src/components/courses/course/CourseSidebar.tsx
// Purpose: Renders the course sidebar UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

"use client";

import { useState } from "react";
import type { CohortProgramCard } from "@/lib/cohortProgramMapper";

interface CourseSidebarProps {
  allCourses: CohortProgramCard[];
  setCourses: (courses: CohortProgramCard[]) => void;
}

const CourseSidebar = ({ allCourses, setCourses }: CourseSidebarProps) => {
  const [showMoreCategory, setShowMoreCategory] = useState(false);
  const [showMoreSkill, setShowMoreSkill] = useState(false);

  // MULTI SELECT ARRAYS
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // CATEGORY OPTIONS
  const allCategory = [
    "All Category",
    ...Array.from(
      new Set(allCourses.map((c) => c.category?.name).filter((name): name is string => Boolean(name)))
    )
  ];

  // SKILL OPTIONS
  const allSkill = [
    "All Skill",
    ...Array.from(new Set(allCourses.map((c) => c.level).filter((level): level is string => Boolean(level))))
  ];

  // FILTER FUNCTION
  const applyFilters = (categories: string[], skills: string[]) => {
    let filtered = [...allCourses];

    // CATEGORY FILTER
    if (categories.length > 0) {
      filtered = filtered.filter((c) => categories.includes(c.category?.name));
    }

    // SKILL FILTER (multi)
    if (skills.length > 0) {
      filtered = filtered.filter((c) => skills.includes(c.level));
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
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setShowMoreCategory(!showMoreCategory);
                }}
              >
                {showMoreCategory ? "Show Less -" : "Show More +"}
              </a>
            </div>
          </div>
        </div>

        {/* STATUS FILTER */}
        <div className="courses-widget">
          <h4 className="widget-title">Cohort Status</h4>
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
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setShowMoreSkill(!showMoreSkill);
                }}
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

