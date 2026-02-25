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

  const initialProgram =
    defaultProgram && programOptions.includes(defaultProgram)
      ? defaultProgram
      : programOptions[0] || "";

  const [selectedProgram, setSelectedProgram] = useState(initialProgram);
  const [showProgramDetails, setShowProgramDetails] = useState(false);

  const selectedCourse = useMemo(
    () => mockCourses.find((course) => course.title === selectedProgram),
    [selectedProgram]
  );

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
              <div className="application-form__select-wrap">
                <select
                  name="program"
                  required
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="application-form__select"
                >
                  {programOptions.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="application-form__eye"
                  onClick={() => setShowProgramDetails((prev) => !prev)}
                  aria-label={
                    showProgramDetails ? "Hide program details" : "Show program details"
                  }
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5c5.25 0 9.55 3.94 10.65 7-1.1 3.06-5.4 7-10.65 7S2.45 15.06 1.35 12C2.45 8.94 6.75 5 12 5zm0 2C7.7 7 4.1 10 3.1 12c1 2 4.6 5 8.9 5s7.9-3 8.9-5c-1-2-4.6-5-8.9-5zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5zm0 1.6a.9.9 0 1 0 .9.9.9.9 0 0 0-.9-.9z" />
                  </svg>
                </button>
              </div>
              {showProgramDetails && selectedCourse && (
                <div className="application-form__details">
                  <div className="application-form__details-head">
                    <span className="application-form__details-title">
                      {selectedCourse.title}
                    </span>
                    <span className="application-form__details-chip">
                      {selectedCourse.level}
                    </span>
                    <span className="application-form__details-chip">
                      {selectedCourse.durationLabel}
                    </span>
                  </div>
                  <p className="application-form__details-desc">
                    {selectedCourse.shortDescription}
                  </p>
                </div>
              )}
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
