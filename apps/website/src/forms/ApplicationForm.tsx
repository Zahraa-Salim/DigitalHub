"use client";

import { mockCourses } from "@/data/mock/programCourseMocks";
import BtnArrow from "@/svg/BtnArrow";
import React, { useMemo, useState } from "react";

type ApplicationFormProps = {
  defaultProgram?: string;
};

type ApplicationFormState = {
  success: boolean;
  error: string | null;
};

const ApplicationForm = ({ defaultProgram }: ApplicationFormProps) => {
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ApplicationFormState>({
    success: false,
    error: null,
  });

  const programOptions = useMemo(() => {
    return Array.from(new Set(mockCourses.map((course) => course.title))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, []);

  const courseByTitle = useMemo(() => {
    const map = new Map<string, (typeof mockCourses)[number]>();
    for (const course of mockCourses) {
      if (!map.has(course.title)) {
        map.set(course.title, course);
      }
    }
    return map;
  }, []);

  const initialProgram =
    defaultProgram && programOptions.includes(defaultProgram)
      ? defaultProgram
      : "";

  const [selectedProgram, setSelectedProgram] = useState(initialProgram);
  const selectedCourse = selectedProgram ? courseByTitle.get(selectedProgram) : undefined;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setState({ success: false, error: null });

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setState({ success: true, error: null });
      e.currentTarget.reset();
      setSelectedProgram(initialProgram);
    } catch {
      setState({
        success: false,
        error: "Unable to submit your application right now. Please try again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} id="application-form">
      <div className="row">
        <div className="col-md-6">
          <div className="form-grp">
            <input name="fullName" type="text" placeholder="Full name *" required />
          </div>
        </div>

        <div className="col-md-6">
          <div className="form-grp">
            <input name="email" type="email" placeholder="E-mail *" required />
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="form-grp">
            <input name="phone" type="tel" placeholder="Phone number *" required />
          </div>
        </div>

        <div className="col-md-6">
          <div className="form-grp">
            <select
              name="program"
              required
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="application-form__select"
            >
              <option value="" disabled>
                Select program
              </option>
              {programOptions.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedCourse && (
        <div className="application-form__course-info">
          <h6>{selectedCourse.title}</h6>
          <p>{selectedCourse.shortDescription}</p>
          <ul className="list-wrap">
            <li>
              <strong>Category:</strong> {selectedCourse.category.name}
            </li>
            <li>
              <strong>Level:</strong> {selectedCourse.level}
            </li>
            <li>
              <strong>Duration:</strong> {selectedCourse.durationLabel}
            </li>
          </ul>
        </div>
      )}

      <div className="row">
        <div className="col-md-4">
          <div className="form-grp">
            <input name="nationality" type="text" placeholder="Nationality *" required />
          </div>
        </div>

        <div className="col-md-4">
          <div className="form-grp">
            <input
              name="countryOfResidence"
              type="text"
              placeholder="Country of Residence *"
              required
            />
          </div>
        </div>

        <div className="col-md-4">
          <div className="form-grp">
            <input name="dateOfBirth" type="date" required />
          </div>
        </div>
      </div>

      <div className="form-grp">
        <input name="education" type="text" placeholder="Education level" />
      </div>

      <div className="form-grp">
        <textarea
          name="motivation"
          placeholder="Why are you applying to this program?"
          required
        ></textarea>
      </div>

      <button type="submit" className="btn btn-two arrow-btn" disabled={pending}>
        {pending ? "Submitting..." : "Submit Application"} <BtnArrow />
      </button>

      {state.success && <p className="text-success mt-2">Application submitted successfully.</p>}
      {state.error && <p className="text-danger mt-2">Error: {state.error}</p>}
    </form>
  );
};

export default ApplicationForm;
