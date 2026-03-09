"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useEffect, useMemo, useState } from "react";
import { useCmsPage } from "@/hooks/useCmsPage";
import { getCmsRecordArray, getCmsString, getCmsStringArray } from "@/lib/cmsContent";
import { API_BASE_URL, listPublicStudents, type PublicStudent } from "@/lib/publicApi";

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
  cvUrl: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  email?: string;
};

type ChatMessage = {
  id: number;
  role: "assistant" | "recruiter";
  text: string;
};

const defaultAssistantMessage =
  "Share the role details and I will surface the best candidate matches with reasons.";

const normalizeExperience = (value: string): "all" | Candidate["experienceLevel"] => {
  if (value === "junior" || value === "mid" || value === "senior") return value;
  return "all";
};

const normalizeLocationType = (value: string): "all" | Candidate["locationType"] => {
  if (value === "remote" || value === "on_site" || value === "hybrid") return value;
  return "all";
};

const toCandidateExperience = (value: string): Candidate["experienceLevel"] => {
  const normalized = normalizeExperience(value);
  return normalized === "all" ? "junior" : normalized;
};

const toCandidateLocationType = (value: string): Candidate["locationType"] => {
  const normalized = normalizeLocationType(value);
  return normalized === "all" ? "remote" : normalized;
};

const applyTemplate = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

const parseSkillList = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
    }
  } catch {
    // Keep fallback split below.
  }
  return raw
    .split(/[,;\n]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const buildLocation = (student: PublicStudent) => {
  const direct = String(student.location || "").trim();
  if (direct) return direct;
  const pieces = [student.city, student.country].map((value) => String(value || "").trim()).filter(Boolean);
  return pieces.length ? pieces.join(", ") : "Beirut, Lebanon";
};

const inferSkillsFromProgram = (programTitle: string) => {
  const normalized = programTitle.toLowerCase();
  if (normalized.includes("frontend")) return ["React", "TypeScript", "UI/UX"];
  if (normalized.includes("backend")) return ["Node.js", "APIs", "PostgreSQL"];
  if (normalized.includes("data")) return ["SQL", "Data Analysis", "Dashboards"];
  if (normalized.includes("ui/ux") || normalized.includes("design")) return ["UI/UX", "Design Systems", "Research"];
  if (normalized.includes("devops")) return ["CI/CD", "Cloud", "Automation"];
  if (normalized.includes("mobile")) return ["React Native", "APIs", "Testing"];
  if (normalized.includes("qa")) return ["Manual Testing", "Automation", "Quality"];
  if (normalized.includes("marketing")) return ["SEO", "Campaigns", "Analytics"];
  if (normalized.includes("product")) return ["Roadmapping", "Discovery", "Stakeholder Mgmt"];
  return ["Collaboration", "Project Delivery", "Communication"];
};

const normalizeExternalUrl = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return raw;
  return `https://${raw}`;
};

const resolveAvatarSrc = (value: string | null | undefined, fallback: string) => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
};

const mapStudentToCandidate = (student: PublicStudent, index: number): Candidate => {
  const cohortRows = Array.isArray(student.cohorts) ? student.cohorts : [];
  const programTitle =
    String(student.program_title || "").trim() || String(cohortRows[0]?.program_title || "").trim();
  const cohortName =
    String(student.cohort_name || "").trim() || String(cohortRows[0]?.cohort_name || "").trim();
  const parsedSkills = parseSkillList(student.skills);
  const skills = parsedSkills.length ? parsedSkills : inferSkillsFromProgram(programTitle);
  const experienceLevel: Candidate["experienceLevel"] = student.is_working ? "mid" : student.is_graduated ? "senior" : "junior";
  const locationType: Candidate["locationType"] = student.open_to_work ? "remote" : student.is_working ? "hybrid" : "on_site";
  const availability = student.open_to_work ? "Immediate" : student.is_working ? "2 weeks" : "1 month";
  const fallbackAvatar = `/assets/img/instructor/instructor0${(index % 6) + 1}.png`;

  return {
    id: Number(student.user_id ?? index + 1),
    name: String(student.full_name || `Participant ${index + 1}`).trim(),
    headline:
      String(student.headline || "").trim() ||
      (student.is_working ? "Working Participant" : student.is_graduated ? "Graduate Participant" : "Participant"),
    experienceLevel,
    locationType,
    location: buildLocation(student),
    availability,
    cohorts: [cohortName, programTitle].filter(Boolean),
    skills: skills.slice(0, 5),
    summary:
      String(student.experience_summary || "").trim() ||
      String(student.bio || "").trim() ||
      "Participant with practical project experience and delivery-focused training.",
    matchNotes: [
      student.open_to_work ? "Open to work and ready for interviews." : "Currently in active delivery track.",
      programTitle ? `Trained in ${programTitle}.` : "Hands-on training completed in cohort workflow.",
      skills.length ? `Core skills include ${skills.slice(0, 3).join(", ")}.` : "Solid communication and collaboration skills.",
    ],
    avatar: resolveAvatarSrc(student.avatar_url, fallbackAvatar),
    cvUrl: String(student.cv_url || "").trim() || "#",
    portfolioUrl: normalizeExternalUrl(student.portfolio_url),
    linkedinUrl: normalizeExternalUrl(student.linkedin_url),
    githubUrl: normalizeExternalUrl(student.github_url),
    email: String(student.email || "").trim(),
  };
};

const HireTalentArea = () => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [experienceFilter, setExperienceFilter] = useState<"all" | Candidate["experienceLevel"]>("all");
  const [locationFilter, setLocationFilter] = useState<"all" | Candidate["locationType"]>("all");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<number[]>([]);
  const [dbCandidates, setDbCandidates] = useState<Candidate[]>([]);

  const page = useCmsPage("hire_talent");
  const content = page?.content ?? null;
  const heroSubtitle = getCmsString(content, ["subtitle", "sub_title"], "Recruiter Toolkit");
  const heroTitle = getCmsString(
    content,
    ["title", "heading", "hero_title", "heroTitle"],
    "Hire Talent With Match Assistant",
  );
  const heroBody = getCmsString(
    content,
    ["description", "body", "text", "hero_subtitle", "heroSubtitle"],
    "Describe your role, refine filters, and shortlist the strongest candidates with clear matching reasons.",
  );
  const assistantTitle = getCmsString(content, ["assistant_title", "assistantTitle"], "Match Assistant");
  const assistantStatus = getCmsString(content, ["assistant_status", "assistantStatus"], "Live UI demo");
  const quickSkillsLabel = getCmsString(content, ["quick_skills_label", "quickSkillsLabel"], "Quick Skills");
  const experienceLabel = getCmsString(content, ["experience_label", "experienceLabel"], "Experience");
  const locationTypeLabel = getCmsString(content, ["location_type_label", "locationTypeLabel"], "Location Type");
  const allLabel = getCmsString(content, ["all_label", "allLabel"], "All");
  const juniorLabel = getCmsString(content, ["junior_label", "juniorLabel"], "Junior");
  const midLabel = getCmsString(content, ["mid_label", "midLabel"], "Mid");
  const seniorLabel = getCmsString(content, ["senior_label", "seniorLabel"], "Senior");
  const remoteLabel = getCmsString(content, ["remote_label", "remoteLabel"], "Remote");
  const hybridLabel = getCmsString(content, ["hybrid_label", "hybridLabel"], "Hybrid");
  const onSiteLabel = getCmsString(content, ["on_site_label", "onSiteLabel"], "On Site");
  const composerPlaceholder = getCmsString(
    content,
    ["composer_placeholder", "composerPlaceholder"],
    "Example: I need a remote React developer with TypeScript and strong UI sense.",
  );
  const findMatchButtonText = getCmsString(content, ["find_match_button_text", "findMatchButtonText"], "Find Best Match");
  const resultsTitle = getCmsString(content, ["results_title", "resultsTitle"], "Candidate Matches");
  const resultsSummaryTemplate = getCmsString(
    content,
    ["results_summary_template", "resultsSummaryTemplate"],
    "{found} found, {shortlisted} shortlisted",
  );
  const availabilityLabel = getCmsString(content, ["availability_label", "availabilityLabel"], "Availability");
  const locationLabel = getCmsString(content, ["location_label", "locationLabel"], "Location");
  const viewProfileText = getCmsString(content, ["view_profile_text", "viewProfileText"], "View Profile");
  const viewCvText = getCmsString(content, ["view_cv_text", "viewCvText"], "View CV");
  const downloadCvText = getCmsString(content, ["download_cv_text", "downloadCvText"], "Download CV");
  const shortlistText = getCmsString(content, ["shortlist_text", "shortlistText"], "Shortlist");
  const shortlistedText = getCmsString(content, ["shortlisted_text", "shortlistedText"], "Shortlisted");
  const modalMatchTitle = getCmsString(content, ["modal_match_title", "modalMatchTitle"], "Why this candidate matches");
  const modalSkillsTitle = getCmsString(content, ["modal_skills_title", "modalSkillsTitle"], "Skills");
  const modalCohortsTitle = getCmsString(content, ["modal_cohorts_title", "modalCohortsTitle"], "Cohorts");
  const contactCandidateText = getCmsString(content, ["contact_candidate_text", "contactCandidateText"], "Contact Candidate");
  const linkedinText = getCmsString(content, ["linkedin_text", "linkedinText"], "LinkedIn");
  const portfolioText = getCmsString(content, ["portfolio_text", "portfolioText"], "Portfolio");
  const defaultAssistantMessageText = getCmsString(
    content,
    ["default_assistant_message", "defaultAssistantMessage"],
    defaultAssistantMessage,
  );
  const noMatchFeedbackText = getCmsString(
    content,
    ["no_match_feedback_text", "noMatchFeedbackText"],
    "No exact matches found yet. Try adding more role details or adjusting filters.",
  );
  const topMatchFeedbackTemplate = getCmsString(
    content,
    ["top_match_feedback_template", "topMatchFeedbackTemplate"],
    "Top match right now is {name} ({score}% match). Review cards on the right to shortlist.",
  );
  const cmsCandidatePool = useMemo<Candidate[]>(
    () =>
      getCmsRecordArray(content, ["candidates"]).map((entry, index) => ({
        id: index + 1,
        name: getCmsString(entry, ["name"], `Candidate ${index + 1}`),
        headline: getCmsString(entry, ["headline"], "Candidate"),
        experienceLevel: toCandidateExperience(getCmsString(entry, ["experienceLevel", "experience_level"], "junior")),
        locationType: toCandidateLocationType(getCmsString(entry, ["locationType", "location_type"], "remote")),
        location: getCmsString(entry, ["location"], "Remote"),
        availability: getCmsString(entry, ["availability"], "Immediate"),
        cohorts: getCmsStringArray(entry, ["cohorts"], []),
        skills: getCmsStringArray(entry, ["skills"], []),
        summary: getCmsString(entry, ["summary"], ""),
        matchNotes: getCmsStringArray(entry, ["matchNotes", "match_notes"], []),
        avatar: getCmsString(entry, ["avatar", "avatar_url", "image"], "/assets/img/instructor/instructor01.png"),
        cvUrl: getCmsString(entry, ["cvUrl", "cv_url"], "#"),
        portfolioUrl: getCmsString(entry, ["portfolioUrl", "portfolio_url"], ""),
        linkedinUrl: getCmsString(entry, ["linkedinUrl", "linkedin_url"], ""),
        githubUrl: getCmsString(entry, ["githubUrl", "github_url"], ""),
        email: getCmsString(entry, ["email"], ""),
      })),
    [content],
  );
  const candidatePool = useMemo(() => {
    if (dbCandidates.length) return dbCandidates;
    return cmsCandidatePool.slice(0, 3);
  }, [dbCandidates, cmsCandidatePool]);
  const skillOptions = useMemo(
    () =>
      Array.from(new Set(candidatePool.flatMap((candidate) => candidate.skills.map((skill) => skill.trim())).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [candidatePool],
  );
  const skillRegexByLabel = useMemo(
    () =>
      Object.fromEntries(
        skillOptions.map((skill) => [skill, new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")]),
      ) as Record<string, RegExp>,
    [skillOptions],
  );

  useEffect(() => {
    let active = true;
    const loadCandidates = async () => {
      try {
        const students = await listPublicStudents({ page: 1, limit: 3, activeOnly: true });
        if (!active) return;
        const mapped = students.map((student, index) => mapStudentToCandidate(student, index));
        setDbCandidates(mapped.slice(0, 3));
      } catch {
        if (!active) return;
        setDbCandidates([]);
      }
    };

    loadCandidates();
    return () => {
      active = false;
    };
  }, []);

  const messages = useMemo(
    () => [{ id: 1, role: "assistant", text: defaultAssistantMessageText }, ...chatMessages],
    [chatMessages, defaultAssistantMessageText],
  );

  useEffect(() => {
    if (!activeCandidate) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [activeCandidate]);

  const scoredCandidates = useMemo(() => {
    return candidatePool.map((candidate) => {
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
      .slice(0, 3);
  }, [candidatePool, chatInput, experienceFilter, locationFilter, selectedSkills]);

  const handleSubmit = () => {
    const message = chatInput.trim();
    if (!message) return;

    const inferredSkills = skillOptions.filter((skill) => skillRegexByLabel[skill]?.test(message));
    if (inferredSkills.length) {
      setSelectedSkills((current) => Array.from(new Set([...current, ...inferredSkills])));
    }

    const topCandidate = scoredCandidates[0];
    const feedback = topCandidate
      ? applyTemplate(topMatchFeedbackTemplate, {
          name: topCandidate.candidate.name,
          score: topCandidate.matchScore,
        })
      : noMatchFeedbackText;

    setChatMessages((current) => [
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
        <div className="hire-talent-head">
          <span className="sub-title">{heroSubtitle}</span>
          <h2 className="title">{heroTitle}</h2>
          <p>{heroBody}</p>
        </div>

        <div className="hire-talent-layout">
          <div className="hire-talent-chat">
            <div className="hire-talent-chat__title-wrap">
              <h3 className="hire-talent-chat__title">{assistantTitle}</h3>
              <span className="hire-talent-chat__status">{assistantStatus}</span>
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
              <p className="hire-talent-filters__label">{quickSkillsLabel}</p>
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
                  {experienceLabel}
                  <select
                    value={experienceFilter}
                    onChange={(event) => setExperienceFilter(normalizeExperience(event.target.value))}
                  >
                    <option value="all">{allLabel}</option>
                    <option value="junior">{juniorLabel}</option>
                    <option value="mid">{midLabel}</option>
                    <option value="senior">{seniorLabel}</option>
                  </select>
                </label>
                <label>
                  {locationTypeLabel}
                  <select
                    value={locationFilter}
                    onChange={(event) => setLocationFilter(normalizeLocationType(event.target.value))}
                  >
                    <option value="all">{allLabel}</option>
                    <option value="remote">{remoteLabel}</option>
                    <option value="hybrid">{hybridLabel}</option>
                    <option value="on_site">{onSiteLabel}</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="hire-talent-chat__composer">
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={composerPlaceholder}
              />
              <button className="btn btn-two" type="button" onClick={handleSubmit}>
                {findMatchButtonText}
              </button>
            </div>
          </div>

          <div className="hire-talent-results">
            <div className="hire-talent-results__head">
              <h3>{resultsTitle}</h3>
              <p>
                {applyTemplate(resultsSummaryTemplate, {
                  found: scoredCandidates.length,
                  shortlisted: shortlistedIds.length,
                })}
              </p>
            </div>

            <div className="hire-talent-cards">
              {scoredCandidates.map(({ candidate, matchScore }) => (
                <article key={candidate.id} className="hire-candidate-card">
                  <div className="hire-candidate-card__head">
                    <div className="hire-candidate-card__avatar-wrap">
                      <div className="hire-candidate-card__avatar">
                        <Image src={candidate.avatar} alt={candidate.name} />
                      </div>
                    </div>
                    <div className="hire-candidate-card__identity">
                      <div className="hire-candidate-card__identity-top">
                        <h4>{candidate.name}</h4>
                        <span className="hire-candidate-card__score">{matchScore}%</span>
                      </div>
                      <p>{candidate.headline}</p>
                      {candidate.cohorts[0] ? <span className="hire-candidate-card__track">{candidate.cohorts[0]}</span> : null}
                    </div>
                  </div>

                  <p className="hire-candidate-card__summary">{candidate.summary}</p>

                  <div className="hire-candidate-card__skills">
                    {candidate.skills.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>

                  <ul className="hire-candidate-card__meta">
                    <li>
                      <strong>{availabilityLabel}:</strong> {candidate.availability}
                    </li>
                    <li>
                      <strong>{locationLabel}:</strong> {candidate.location}
                    </li>
                  </ul>

                  <div className="hire-candidate-card__actions">
                    <button type="button" className="btn" onClick={() => setActiveCandidate(candidate)}>
                      {viewProfileText}
                    </button>
                    <a href={candidate.cvUrl} target="_blank" rel="noreferrer" className="btn btn-border">
                      {viewCvText}
                    </a>
                    <a href={candidate.cvUrl} download={`${candidate.name.replace(/\s+/g, "-")}-CV.pdf`} className="btn btn-border">
                      {downloadCvText}
                    </a>
                    <button
                      type="button"
                      className={`btn btn-border ${shortlistedIds.includes(candidate.id) ? "is-shortlisted" : ""}`}
                      onClick={() => toggleShortlist(candidate.id)}
                    >
                      {shortlistedIds.includes(candidate.id) ? shortlistedText : shortlistText}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeCandidate ? (
        <div className="hire-candidate-modal" role="dialog" aria-modal="true" onClick={() => setActiveCandidate(null)}>
          <div className="hire-candidate-modal__dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="hire-candidate-modal__close" onClick={() => setActiveCandidate(null)}>
              <span aria-hidden>×</span>
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
                <h4>{modalMatchTitle}</h4>
                <ul>
                  {activeCandidate.matchNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>{modalSkillsTitle}</h4>
                <div className="hire-candidate-card__skills">
                  {activeCandidate.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4>{modalCohortsTitle}</h4>
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
                  {contactCandidateText}
                </a>
              ) : null}
              {activeCandidate.linkedinUrl ? (
                <Link to={activeCandidate.linkedinUrl} target="_blank" rel="noreferrer" className="btn btn-border">
                  {linkedinText}
                </Link>
              ) : null}
              {activeCandidate.githubUrl ? (
                <Link to={activeCandidate.githubUrl} target="_blank" rel="noreferrer" className="btn btn-border">
                  GitHub
                </Link>
              ) : null}
              {activeCandidate.portfolioUrl ? (
                <Link to={activeCandidate.portfolioUrl} target="_blank" rel="noreferrer" className="btn btn-border">
                  {portfolioText}
                </Link>
              ) : null}
              <a href={activeCandidate.cvUrl} target="_blank" rel="noreferrer" className="btn btn-two">
                {viewCvText}
              </a>
              <a
                href={activeCandidate.cvUrl}
                download={`${activeCandidate.name.replace(/\s+/g, "-")}-CV.pdf`}
                className="btn btn-two"
              >
                {downloadCvText}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default HireTalentArea;
