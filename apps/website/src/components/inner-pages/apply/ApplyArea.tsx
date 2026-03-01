"use client";

import ApplicationForm from "@/forms/ApplicationForm";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const ApplyArea = () => {
  const [searchParams] = useSearchParams();

  const defaultProgram = useMemo(() => {
    const program = searchParams.get("program");
    return program ? program.trim() : undefined;
  }, [searchParams]);

  return (
    <section className="contact-area apply-area section-py-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="contact-form-wrap">
              <h4 className="title">Apply to a Program</h4>
              <p>
                Fill in your details and choose the program you want to join. We will review your
                application and contact you.
              </p>
              <ApplicationForm defaultProgram={defaultProgram} />
              <p className="ajax-response mb-0"></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApplyArea;
