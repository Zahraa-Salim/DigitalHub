"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";
import { useEffect, useState } from "react";

import aboutHeroImage from "@/assets/img/others/inner_about_img.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type PublicListResponse<T> = {
  success?: boolean;
  data?: T[];
};

type ProgramItem = {
  id: number;
};

type CohortItem = {
  id: number;
  status: "planned" | "coming_soon" | "open" | "running" | "completed" | "cancelled";
  allow_applications: boolean;
};

type PersonItem = {
  user_id: number;
};

type AboutStats = {
  programs: number;
  openCohorts: number;
  students: number;
  instructors: number;
};

const defaultStats: AboutStats = {
  programs: 2,
  openCohorts: 1,
  students: 1,
  instructors: 2,
};

const getArrayPayload = <T,>(raw: unknown): T[] => {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && Array.isArray((raw as PublicListResponse<T>).data)) {
    return (raw as PublicListResponse<T>).data as T[];
  }
  return [];
};

const About = () => {
  const [stats, setStats] = useState<AboutStats>(defaultStats);

  useEffect(() => {
    const readList = async <T,>(path: string): Promise<T[]> => {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return [];
      const json = (await res.json()) as unknown;
      return getArrayPayload<T>(json);
    };

    const loadAboutData = async () => {
      try {
        const [programs, cohorts, students, instructors, managers] = await Promise.all([
          readList<ProgramItem>("/public/programs"),
          readList<CohortItem>("/public/cohorts"),
          readList<PersonItem>("/public/students"),
          readList<PersonItem>("/public/instructors"),
          readList<PersonItem>("/public/managers"),
        ]);

        const openCohorts = cohorts.filter(
          (cohort) => cohort.allow_applications && (cohort.status === "open" || cohort.status === "running")
        ).length;

        setStats({
          programs: programs.length || defaultStats.programs,
          openCohorts: openCohorts || defaultStats.openCohorts,
          students: students.length || defaultStats.students,
          instructors: instructors.length + managers.length || defaultStats.instructors,
        });
      } catch {
        setStats(defaultStats);
      }
    };

    loadAboutData();
  }, []);

  return (
    <section className="dh-about-pro section-py-120">
      <div className="container">
        <div className="dh-about-pro__hero">
          <div className="dh-about-pro__content">
            <span className="dh-about-pro__tag">About Digital Hub</span>
            <h2 className="title">
              Practical Training For
              <span>Career Outcomes</span>
            </h2>
            <p className="desc">
              Digital Hub helps learners move from theory to execution through project-based
              programs, hands-on mentorship, and structured support.
            </p>
            <div className="dh-about-pro__pills">
              <span>Industry-led tracks</span>
              <span>Portfolio-focused delivery</span>
              <span>Career readiness support</span>
            </div>
            <div className="dh-about-pro__cta">
              <Link to="/apply" className="btn arrow-btn">
                Apply Now <BtnArrow />
              </Link>
              <Link to="/courses" className="ghost-btn">
                Browse Programs
              </Link>
            </div>
          </div>

          <div className="dh-about-pro__media">
            <div className="dh-about-pro__image-main">
              <Image src={aboutHeroImage} alt="Digital Hub learners collaborating" />
            </div>
            <article className="dh-about-pro__stat-card">
              <p className="number">{stats.instructors.toLocaleString()}+</p>
              <p className="label">Public Team Members</p>
            </article>
          </div>
        </div>

        <div className="dh-about-pro__stats">
          <article className="dh-about-pro__stats-item">
            <p className="number">{stats.programs.toLocaleString()}+</p>
            <p className="label">Published Programs</p>
          </article>
          <article className="dh-about-pro__stats-item">
            <p className="number">{stats.openCohorts.toLocaleString()}+</p>
            <p className="label">Open Cohorts</p>
          </article>
          <article className="dh-about-pro__stats-item">
            <p className="number">{stats.students.toLocaleString()}+</p>
            <p className="label">Public Student Profiles</p>
          </article>
        </div>

        <div className="dh-about-pro__focus row g-4">
          <div className="col-lg-4 col-md-6">
            <article className="dh-about-pro__focus-card">
              <h4>Applied Learning</h4>
              <p>Every learner builds practical projects aligned with real workplace skills.</p>
            </article>
          </div>
          <div className="col-lg-4 col-md-6">
            <article className="dh-about-pro__focus-card">
              <h4>Mentorship</h4>
              <p>Instructors and program leads provide direct feedback and structured support.</p>
            </article>
          </div>
          <div className="col-lg-4 col-md-6">
            <article className="dh-about-pro__focus-card">
              <h4>Career Preparation</h4>
              <p>Training includes portfolio quality standards and interview-readiness guidance.</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
