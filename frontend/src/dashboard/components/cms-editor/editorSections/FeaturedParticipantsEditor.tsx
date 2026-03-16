import { useEffect, useMemo, useState } from "react";
import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";
import { getCmsNumber } from "@/lib/cmsContent";
import { API_BASE_URL, listPublicStudents, type PublicStudent } from "@/lib/publicApi";
import { EditableSpan } from "../EditableSpan";
import { useEditor } from "../EditorContext";

type FeaturedParticipantsEditorProps = {
  content?: Record<string, unknown> | null;
  sectionId: number;
};

type FeaturedParticipantCard = {
  id: number | string;
  name: string;
  role: string;
  status: string;
  bio: string;
  avatar: string | null;
  skills: string[];
  secondaryTag: string;
};

const resolveAvatar = (url: string | null | undefined) => {
  const value = String(url || "").trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/${value}`;
};

const isPlaceholderParticipantAvatar = (url: string | null | undefined) => {
  const value = String(url || "").trim().toLowerCase();
  if (!value) return true;
  return (
    value.includes("/assets/img/instructor/") ||
    value.includes("/assets/img/testimonial/") ||
    value.includes("/assets/img/team/")
  );
};

const parseSkillList = (value: string | null | undefined) =>
  String(value || "")
    .split(/[,;\n]/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 3);

const resolveStudentStatus = (student: PublicStudent) => {
  if (student.open_to_work) return "Open to Work";
  if (student.is_working) return "Working";
  if (student.is_graduated) return "Graduated";
  return "Participant";
};

const statusClassName = (status: string) => {
  if (status === "Open to Work" || status === "Available") return "is-open";
  if (status === "Working") return "is-working";
  if (status === "Graduated") return "is-neutral";
  return "is-busy";
};

const toInitials = (fullName: string) => {
  const source = String(fullName || "").trim();
  if (!source) return "DH";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[1]?.charAt(0) ?? "" : parts[0]?.charAt(1) ?? "";
  const value = `${first}${second}`.trim();
  return value ? value.toUpperCase() : "DH";
};

const mapStudent = (student: PublicStudent, index: number): FeaturedParticipantCard => {
  const status = resolveStudentStatus(student);
  const secondaryTag = String(student.program_title || "").trim() || "Program Not Set";
  return {
    id: student.user_id ?? student.public_slug ?? `student-${index}`,
    name: student.full_name || "Participant",
    role: student.headline || (student.is_working ? "Working Participant" : "Participant"),
    status,
    bio: student.bio || "",
    avatar: isPlaceholderParticipantAvatar(student.avatar_url) ? null : resolveAvatar(student.avatar_url),
    skills: parseSkillList(student.skills),
    secondaryTag,
  };
};

const FeaturedParticipantsEditor = ({ content, sectionId }: FeaturedParticipantsEditorProps) => {
  const { getValue } = useEditor();
  const [students, setStudents] = useState<FeaturedParticipantCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const featuredLimit = Math.trunc(getCmsNumber(content, ["limit", "card_limit", "items_limit"], 3, 1, 24));
  const ctaLink = getValue(sectionId, "cta_link") || "/participants";

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const featured = await listPublicStudents({
          page: 1,
          limit: featuredLimit,
          featured: true,
          activeOnly: true,
        });

        if (!active) return;

        if (Array.isArray(featured) && featured.length > 0) {
          setStudents(featured.map(mapStudent));
          setError(null);
          return;
        }

        const fallback = await listPublicStudents({
          page: 1,
          limit: featuredLimit,
          activeOnly: true,
        });
        if (!active) return;
        setStudents(Array.isArray(fallback) ? fallback.map(mapStudent) : []);
        setError(null);
      } catch {
        if (!active) return;
        setStudents([]);
        setError("Unable to load participants right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [featuredLimit]);

  const visibleItems = useMemo(() => students.slice(0, featuredLimit), [featuredLimit, students]);

  return (
    <section className="featured-participants-home section-py-120">
      <div className="container">
        <div className="section__title text-center mb-40">
          <EditableSpan sectionId={sectionId} field="subtitle" fallback="Featured Participants" tag="span" className="sub-title" />
          <EditableSpan
            sectionId={sectionId}
            field="title"
            fallback="Meet Active Participants Building Real Work"
            tag="h2"
            className="title"
          />
          <p>
            <EditableSpan
              sectionId={sectionId}
              field="description"
              fallback="Explore active students currently building projects, growing their skills, and contributing across Digital Hub programs."
              multiline
            />
          </p>
        </div>

        <div className="row g-4 justify-content-center">
          {loading
            ? Array.from({ length: featuredLimit }).map((_, index) => (
              <div key={`featured-people-skeleton-${index}`} className="col-xl-4 col-md-6">
                <article className="people-card people-card--participant people-card--featured-home people-card--skeleton" aria-hidden="true">
                  <div className="people-card__head people-card__head--participant">
                    <div className="people-card__media">
                      <div className="people-card__avatar people-card__skeleton-block" />
                      <span className="people-card__skeleton-pill people-card__skeleton-block" />
                    </div>
                    <div className="people-card__identity">
                      <div className="people-card__skeleton-line people-card__skeleton-line--title people-card__skeleton-block" />
                      <div className="people-card__skeleton-line people-card__skeleton-line--role people-card__skeleton-block" />
                      <div className="people-card__skeleton-line people-card__skeleton-line--bio people-card__skeleton-block" />
                    </div>
                  </div>
                  <div className="people-card__skeleton-line people-card__skeleton-line--bio people-card__skeleton-block" />
                  <div className="people-card__tags">
                    <span className="people-card__skeleton-tag people-card__skeleton-block" />
                    <span className="people-card__skeleton-tag people-card__skeleton-block" />
                  </div>
                </article>
              </div>
            ))
            : visibleItems.map((item, index) => {
              const topSkills = item.skills.slice(0, 3);
              const showWorkBadge = item.status === "Open to Work" || item.status === "Working";

              return (
                <div key={item.id} className="col-xl-4 col-md-6">
                  <article
                    className="people-card people-card--participant people-card--featured-home"
                    data-aos="fade-up"
                    data-aos-delay={(index % 3) * 100}
                  >
                    <div className="people-card__head people-card__head--participant">
                      <button
                        type="button"
                        className="people-card__avatar-btn"
                        aria-label={`View ${item.name} profile`}
                      >
                        <div className="people-card__avatar">
                          {item.avatar ? (
                            <Image src={item.avatar} alt={item.name} />
                          ) : (
                            <span className="people-card__avatar-fallback" aria-hidden="true">
                              {toInitials(item.name)}
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="people-card__identity">
                        <button type="button" className="people-card__name-btn people-card__name-btn--inline">
                          <h4 className="people-card__name">{item.name}</h4>
                        </button>
                        {showWorkBadge ? (
                          <span className={`people-card__status people-card__status--stacked ${statusClassName(item.status)}`}>{item.status}</span>
                        ) : null}
                      </div>
                    </div>

                    {item.bio ? <p className="people-card__bio">{item.bio}</p> : null}

                    <div className="people-card__tags">
                      {topSkills.length > 0
                        ? topSkills.map((skill) => <span key={`${item.id}-${skill}`}>{skill}</span>)
                        : <span>{item.secondaryTag}</span>}
                    </div>
                  </article>
                </div>
              );
            })}

          {!loading && visibleItems.length === 0 && (
            <div className="col-12">
              <p className="people-empty">{error || "No featured participants available right now."}</p>
            </div>
          )}
        </div>

        <div className="featured-participants-home__cta">
          <Link to={ctaLink} className="btn arrow-btn">
            <EditableSpan sectionId={sectionId} field="cta_text" fallback="View All Participants" />
            <BtnArrow />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedParticipantsEditor;
