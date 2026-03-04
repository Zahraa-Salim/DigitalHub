"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { API_BASE_URL, listPublicStudents, type PublicStudent } from "@/lib/publicApi";
import { useEffect, useMemo, useState } from "react";

type Candidate = {
  id: number;
  name: string;
  headline: string;
  experienceLevel: "junior" | "mid" | "senior";
  locationType: "remote" | "on_site" | "hybrid";
  location: string;
  availability: string;
  cohorts: string[];
  skills: string[];
  summary: string;
  matchNotes: string[];
  avatar: string;
  cvUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  email?: string;
};

type ChatMessage = {
  id: number;
  role: "assistant" | "recruiter";
  text: string;
};

const STUDENTS_FETCH_LIMIT = 100;
const MAX_STUDENT_FETCH_PAGES = 20;
const FALLBACK_SKILL_OPTIONS = ["React", "TypeScript", "Node.js", "PostgreSQL", "UI/UX", "Data Analysis"] as const;
const fallbackAvatar = "/assets/img/instructor/instructor01.png";

const defaultAssistantMessage =
  "Share the role details and I will surface the best candidate matches with reasons.";

const parseSkillList = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry || "").trim()).filter(Boolean);
    }
  } catch {
    // Keep split fallback.
  }
  return raw
    .split(/[,;\n]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const resolveAssetUrl = (url: string | null | undefined, fallback = "") => {
  const value = String(url || "").trim();
  if (!value) return fallback;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/${value}`;
};

const normalizeExternalUrl = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
};

const buildLocation = (student: PublicStudent) => {
  const direct = String(student.location || "").trim();
  if (direct) return direct;
  const pieces = [student.city, student.country].map((item) => String(item || "").trim()).filter(Boolean);
  return pieces.length ? pieces.join(", ") : "Location not specified";
};

const inferExperienceLevel = (student: PublicStudent): Candidate["experienceLevel"] => {
  const headline = String(student.headline || "").toLowerCase();
  const summary = String(student.experience_summary || "").toLowerCase();
  const text = `${headline} ${summary}`;
  if (text.includes("senior") || text.includes("lead")) return "senior";
  if (text.includes("junior") || text.includes("entry")) return "junior";
  return "mid";
};

const inferLocationType = (location: string): Candidate["locationType"] => {
  const normalized = location.toLowerCase();
  if (normalized.includes("remote")) return "remote";
  if (normalized.includes("hybrid")) return "hybrid";
  return "on_site";
};

const mapStudentToCandidate = (student: PublicStudent): Candidate => {
  const location = buildLocation(student);
  const skills = parseSkillList(student.skills);
  const cohortPairs =
    Array.isArray(student.cohorts) && student.cohorts.length > 0
      ? student.cohorts
      : [{ cohort_name: student.cohort_name || "", program_title: student.program_title || "" }];
  const cohorts = cohortPairs
    .map((entry) => [entry.program_title, entry.cohort_name].filter(Boolean).join(" - "))
    .filter(Boolean);

  const summary =
    String(student.experience_summary || "").trim() ||
    String(student.bio || "").trim() ||
    "Profile summary is available on request.";

  const matchNotes: string[] = [];
  if (student.open_to_work) matchNotes.push("Marked as open to work");
  if (skills.length > 0) matchNotes.push(`Skills include ${skills.slice(0, 2).join(" and ")}`);
  if (cohorts[0]) matchNotes.push(`Trained in ${cohorts[0]}`);
  if (String(student.headline || "").trim()) {
    matchNotes.push(`Headline: ${String(student.headline).trim()}`);
  }

  return {
    id: student.user_id,
    name: student.full_name || "Candidate",
    headline: String(student.headline || "").trim() || "Digital Hub Participant",
    experienceLevel: inferExperienceLevel(student),
    locationType: inferLocationType(location),
    location,
    availability: student.open_to_work ? "Immediate" : student.is_working ? "Working" : "Available",
    cohorts: cohorts.length ? cohorts : ["Digital Hub Cohort"],
    skills: skills.length ? skills : ["General"],
    summary,
    matchNotes: matchNotes.length ? matchNotes : ["Profile sourced from public participants database"],
    avatar: resolveAssetUrl(student.avatar_url, fallbackAvatar),
    cvUrl: resolveAssetUrl(student.cv_url, ""),
    portfolioUrl: normalizeExternalUrl(student.portfolio_url),
    linkedinUrl: normalizeExternalUrl(student.linkedin_url),
    email: String(student.email || "").trim() || undefined,
  };
};

const HireTalentArea = () => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [experienceFilter, setExperienceFilter] = useState<"all" | Candidate["experienceLevel"]>("all");
  const [locationFilter, setLocationFilter] = useState<"all" | Candidate["locationType"]>("all");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "assistant", text: defaultAssistantMessage },
  ]);
  const [candidatePool, setCandidatePool] = useState<Candidate[]>([]);
  const [skillOptions, setSkillOptions] = useState<string[]>([...FALLBACK_SKILL_OPTIONS]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<number[]>([]);

  useEffect(() => {
    let active = true;

    const loadCandidates = async () => {
      setLoadingCandidates(true);
      try {
        const students: PublicStudent[] = [];
        for (let page = 1; page <= MAX_STUDENT_FETCH_PAGES; page += 1) {
          const chunk = await listPublicStudents({ page, limit: STUDENTS_FETCH_LIMIT });
          students.push(...chunk);
          if (chunk.length < STUDENTS_FETCH_LIMIT) break;
        }

        if (!active) return;

        const candidates = students.map(mapStudentToCandidate);
        setCandidatePool(candidates);
        setLoadError(null);

        const frequency = new Map<string, number>();
        candidates.forEach((candidate) => {
          candidate.skills.forEach((skill) => {
            const normalized = skill.trim();
            if (!normalized || normalized.toLowerCase() === "general") return;
            frequency.set(normalized, (frequency.get(normalized) || 0) + 1);
          });
        });
        const dynamicSkills = Array.from(frequency.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 12)
          .map(([skill]) => skill);

        setSkillOptions(dynamicSkills.length ? dynamicSkills : [...FALLBACK_SKILL_OPTIONS]);
      } catch {
        if (!active) return;
        setCandidatePool([]);
        setSkillOptions([...FALLBACK_SKILL_OPTIONS]);
        setLoadError("Unable to load candidates right now.");
      } finally {
        if (active) setLoadingCandidates(false);
      }
    };

    void loadCandidates();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedSkills((current) => current.filter((skill) => skillOptions.includes(skill)));
  }, [skillOptions]);

  useEffect(() => {
    if (!activeCandidate) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activeCandidate]);

  const scoredCandidates = useMemo(() => {
    return candidatePool
      .map((candidate) => {
        let score = 55;

        if (experienceFilter !== "all" && candidate.experienceLevel === experienceFilter) score += 10;
        if (locationFilter !== "all" && candidate.locationType === locationFilter) score += 10;

        const skillHits = selectedSkills.filter((skill) => candidate.skills.includes(skill)).length;
        score += skillHits * 8;

        const query = chatInput.trim().toLowerCase();
        if (query) {
          if (candidate.headline.toLowerCase().includes(query)) score += 10;
          const keywordHits = candidate.skills.filter((skill) => query.includes(skill.toLowerCase())).length;
          score += keywordHits * 6;
        }

        return {
          candidate,
          matchScore: Math.min(99, score),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
  }, [candidatePool, chatInput, experienceFilter, locationFilter, selectedSkills]);

  const handleSubmit = () => {
    const message = chatInput.trim();
    if (!message) return;

    const inferredSkills = skillOptions.filter((skill) => new RegExp(skill.replace(".", "\\."), "i").test(message));
    if (inferredSkills.length) {
      setSelectedSkills((current) => Array.from(new Set([...current, ...inferredSkills])));
    }

    const topCandidate = scoredCandidates[0];
    const feedback = topCandidate
      ? `Top match right now is ${topCandidate.candidate.name} (${topCandidate.matchScore}% match). Review cards on the right to shortlist.`
      : "No exact matches found yet. Try adding more role details or adjusting filters.";

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "recruiter", text: message },
      { id: Date.now() + 1, role: "assistant", text: feedback },
    ]);
    setChatInput("");
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill) ? current.filter((value) => value !== skill) : [...current, skill],
    );
  };

  const toggleShortlist = (id: number) => {
    setShortlistedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  return (
    <section className="hire-talent-area section-py-120">
      <div className="container">
        <div className="hire-talent-cta" data-aos="fade-up">
          <div className="hire-talent-cta__content">
            <p className="hire-talent-cta__eyebrow">Hiring Urgently?</p>
            <h3>Connect with job-ready digital talent faster.</h3>
            <p>Tell us your role and shortlist qualified candidates in minutes with clear fit signals.</p>
          </div>
          <a href="#hire-candidate-results" className="btn btn-two hire-talent-cta__btn">
            Start Hiring Now
          </a>
        </div>

        <div className="hire-talent-head">
          <span className="sub-title">Recruiter Toolkit</span>
          <h2 className="title">Hire Talent With Match Assistant</h2>
          <p>Candidate data and profile cards are loaded dynamically from the participants database.</p>
        </div>

        <div className="hire-talent-layout">
          <div className="hire-talent-chat">
            <div className="hire-talent-chat__title-wrap">
              <h3 className="hire-talent-chat__title">Match Assistant</h3>
              <span className="hire-talent-chat__status">{loadingCandidates ? "Loading candidates..." : "Live from database"}</span>
            </div>

            <div className="hire-talent-chat__messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`hire-talent-bubble ${
                    message.role === "assistant" ? "hire-talent-bubble--assistant" : "hire-talent-bubble--recruiter"
                  }`}
                >
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <div className="hire-talent-filters">
              <p className="hire-talent-filters__label">Quick Skills</p>
              <div className="hire-talent-skill-chips">
                {skillOptions.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    className={`hire-talent-skill-chip ${selectedSkills.includes(skill) ? "is-active" : ""}`}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </button>
                ))}
              </div>

              <div className="hire-talent-selects">
                <label>
                  Experience
                  <select value={experienceFilter} onChange={(event) => setExperienceFilter(event.target.value as typeof experienceFilter)}>
                    <option value="all">All</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid</option>
                    <option value="senior">Senior</option>
                  </select>
                </label>
                <label>
                  Location Type
                  <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value as typeof locationFilter)}>
                    <option value="all">All</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="on_site">On Site</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="hire-talent-chat__composer">
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Example: I need a remote React developer with TypeScript and strong UI sense."
              />
              <button className="btn btn-two" type="button" onClick={handleSubmit} disabled={loadingCandidates}>
                Find Best Match
              </button>
            </div>
          </div>

          <div className="hire-talent-results" id="hire-candidate-results">
            <div className="hire-talent-results__head">
              <h3>Candidate Matches</h3>
              <p>
                {scoredCandidates.length} found, {shortlistedIds.length} shortlisted
              </p>
            </div>

            <div className="hire-talent-cards">
              {!loadingCandidates &&
                scoredCandidates.map(({ candidate, matchScore }) => (
                  <article key={candidate.id} className="hire-candidate-card">
                    <div className="hire-candidate-card__head">
                      <div className="hire-candidate-card__avatar">
                        <Image src={candidate.avatar} alt={candidate.name} />
                      </div>
                      <div>
                        <h4>{candidate.name}</h4>
                        <p>{candidate.headline}</p>
                      </div>
                      <span className="hire-candidate-card__score">{matchScore}%</span>
                    </div>

                    <p className="hire-candidate-card__summary">{candidate.summary}</p>

                    <div className="hire-candidate-card__skills">
                      {candidate.skills.map((skill) => (
                        <span key={`${candidate.id}-${skill}`}>{skill}</span>
                      ))}
                    </div>

                    <ul className="hire-candidate-card__meta">
                      <li>
                        <strong>Availability:</strong> {candidate.availability}
                      </li>
                      <li>
                        <strong>Location:</strong> {candidate.location}
                      </li>
                    </ul>

                    <div className="hire-candidate-card__actions">
                      <button type="button" className="btn" onClick={() => setActiveCandidate(candidate)}>
                        View Profile
                      </button>
                      {candidate.cvUrl ? (
                        <>
                          <a href={candidate.cvUrl} target="_blank" rel="noreferrer" className="btn btn-border">
                            View CV
                          </a>
                          <a
                            href={candidate.cvUrl}
                            download={`${candidate.name.replace(/\s+/g, "-")}-CV.pdf`}
                            className="btn btn-border"
                          >
                            Download CV
                          </a>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn btn-border" disabled>
                            View CV
                          </button>
                          <button type="button" className="btn btn-border" disabled>
                            Download CV
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className={`btn btn-border ${shortlistedIds.includes(candidate.id) ? "is-shortlisted" : ""}`}
                        onClick={() => toggleShortlist(candidate.id)}
                      >
                        {shortlistedIds.includes(candidate.id) ? "Shortlisted" : "Shortlist"}
                      </button>
                    </div>
                  </article>
                ))}

              {loadingCandidates && <p className="people-empty">Loading candidates from database...</p>}
              {!loadingCandidates && scoredCandidates.length === 0 && (
                <p className="people-empty">{loadError || "No candidates found yet. Add participant profiles to the database."}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {activeCandidate ? (
        <div className="hire-candidate-modal" role="dialog" aria-modal="true" onClick={() => setActiveCandidate(null)}>
          <div className="hire-candidate-modal__dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="hire-candidate-modal__close" onClick={() => setActiveCandidate(null)}>
              <span aria-hidden>x</span>
              <span className="visually-hidden">Close</span>
            </button>

            <div className="hire-candidate-modal__head">
              <div className="hire-candidate-modal__avatar">
                <Image src={activeCandidate.avatar} alt={activeCandidate.name} />
              </div>
              <div>
                <h3>{activeCandidate.name}</h3>
                <p>{activeCandidate.headline}</p>
                <small>{activeCandidate.location}</small>
              </div>
            </div>

            <div className="hire-candidate-modal__body">
              <div>
                <h4>Why this candidate matches</h4>
                <ul>
                  {activeCandidate.matchNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Skills</h4>
                <div className="hire-candidate-card__skills">
                  {activeCandidate.skills.map((skill) => (
                    <span key={`modal-${activeCandidate.id}-${skill}`}>{skill}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4>Cohorts</h4>
                <ul>
                  {activeCandidate.cohorts.map((cohort) => (
                    <li key={cohort}>{cohort}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="hire-candidate-modal__foot">
              {activeCandidate.email ? (
                <a href={`mailto:${activeCandidate.email}`} className="btn btn-border">
                  Contact Candidate
                </a>
              ) : null}
              {activeCandidate.linkedinUrl ? (
                <Link to={activeCandidate.linkedinUrl} target="_blank" rel="noreferrer" className="btn btn-border">
                  LinkedIn
                </Link>
              ) : null}
              {activeCandidate.portfolioUrl ? (
                <Link to={activeCandidate.portfolioUrl} target="_blank" rel="noreferrer" className="btn btn-border">
                  Portfolio
                </Link>
              ) : null}
              {activeCandidate.cvUrl ? (
                <>
                  <a href={activeCandidate.cvUrl} target="_blank" rel="noreferrer" className="btn btn-two">
                    View CV
                  </a>
                  <a
                    href={activeCandidate.cvUrl}
                    download={`${activeCandidate.name.replace(/\s+/g, "-")}-CV.pdf`}
                    className="btn btn-two"
                  >
                    Download CV
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default HireTalentArea;
