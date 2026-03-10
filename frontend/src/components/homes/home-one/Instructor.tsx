// File: frontend/src/components/homes/home-one/Instructor.tsx
// Purpose: Renders the instructor UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

import Link from "@/components/common/Link";
import Image, { StaticImageData } from "@/components/common/Image";
import BtnArrow from "@/svg/BtnArrow";
import { getCmsNumber, getCmsRecord, getCmsRecordArray, getCmsString } from "@/lib/cmsContent";
import {
   API_BASE_URL,
   getPublicThemeTokens,
   listPublicInstructors,
   listPublicManagers,
   type PublicThemeToken,
} from "@/lib/publicApi";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

import instructor_thumb1 from "@/assets/img/instructor/instructor01.png"
import instructor_thumb2 from "@/assets/img/instructor/instructor05.png"
import instructor_thumb3 from "@/assets/img/instructor/instructor06.png"
import instructor_thumb4 from "@/assets/img/instructor/instructor04.png"

type DataType = {
   id: number;
   thumb: StaticImageData | string | null;
   title: string;
   designation: string;
   bio: string;
   skills: string[];
   profileLink: string;
   socials: {
      linkedin: string;
      github: string;
      portfolio: string;
      twitter?: string;
      instagram?: string;
      youtube?: string;
   };
};

type SocialItem = {
   key: "linkedin" | "github" | "portfolio" | "twitter" | "instagram" | "youtube";
   iconClass: string;
   url: string;
   label: string;
};

const instructor_data: DataType[] = [
   {
      id: 1,
      thumb: instructor_thumb1,
      title: "Mark Jukarberg",
      designation: "UX Design Lead",
      bio: "Design lead focused on turning learning pathways into employable project outcomes.",
      skills: ["UX Research", "Design Systems", "Mentoring"],
      profileLink: "/team",
      socials: { linkedin: "#", github: "#", portfolio: "#", twitter: "", instagram: "", youtube: "" },
   },
   {
      id: 2,
      thumb: instructor_thumb2,
      title: "Web Design",
      designation: "Olivia Mia",
      bio: "Coach supporting learners with practical design and portfolio-ready project feedback.",
      skills: ["UI Design", "Prototyping", "Brand Systems"],
      profileLink: "/team",
      socials: { linkedin: "#", github: "#", portfolio: "#", twitter: "", instagram: "", youtube: "" },
   },
   {
      id: 3,
      thumb: instructor_thumb3,
      title: "William Hope",
      designation: "Digital Marketing",
      bio: "Marketing mentor helping students bridge training into measurable digital outcomes.",
      skills: ["Growth", "Content Strategy", "Analytics"],
      profileLink: "/team",
      socials: { linkedin: "#", github: "#", portfolio: "#", twitter: "", instagram: "", youtube: "" },
   },
   {
      id: 4,
      thumb: instructor_thumb4,
      title: "Sophia Ava",
      designation: "Web Development",
      bio: "Engineering instructor focused on real-world implementation and team collaboration.",
      skills: ["React", "Node.js", "APIs"],
      profileLink: "/team",
      socials: { linkedin: "#", github: "#", portfolio: "#", twitter: "", instagram: "", youtube: "" },
   },
];

type InstructorProps = {
   content?: Record<string, unknown> | null;
};

type CssVars = CSSProperties & Record<`--${string}`, string>;

const DEFAULT_FALLBACK_GRADIENT = {
   start: "#0f6bff",
   mid: "#20a3ff",
   end: "#2fc7ff",
};

const splitSkillText = (value: string | null | undefined) =>
   String(value || "")
      .split(/[,\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean);

const buildSkillList = (...values: Array<string | null | undefined>) => {
   const seen = new Set<string>();
   values.forEach((value) => {
      splitSkillText(value).forEach((skill) => {
         const key = skill.toLowerCase();
         if (!seen.has(key)) {
            seen.add(key);
         }
      });
   });
   return Array.from(seen).slice(0, 10);
};

const pickThemeValue = (tokens: PublicThemeToken[], candidates: string[]) => {
   const normalizedCandidates = candidates.map((entry) => entry.trim().toLowerCase());
   const match = tokens.find((token) => normalizedCandidates.includes(String(token.key || "").trim().toLowerCase()));
   const value = String(match?.value || "").trim();
   return value || null;
};

const buildFallbackGradientVars = (tokens: PublicThemeToken[]): CssVars => {
   const start = pickThemeValue(tokens, [
      "--instructor-avatar-fallback-start",
      "--instructor-fallback-start",
      "--team-avatar-fallback-start",
      "--team-fallback-start",
   ]);
   const mid = pickThemeValue(tokens, [
      "--instructor-avatar-fallback-mid",
      "--instructor-fallback-mid",
      "--team-avatar-fallback-mid",
      "--team-fallback-mid",
   ]);
   const end = pickThemeValue(tokens, [
      "--instructor-avatar-fallback-end",
      "--instructor-fallback-end",
      "--team-avatar-fallback-end",
      "--team-fallback-end",
   ]);

   return {
      "--dh-instructor-fallback-start": start || DEFAULT_FALLBACK_GRADIENT.start,
      "--dh-instructor-fallback-mid": mid || DEFAULT_FALLBACK_GRADIENT.mid,
      "--dh-instructor-fallback-end": end || DEFAULT_FALLBACK_GRADIENT.end,
   };
};

const Instructor = ({ content }: InstructorProps) => {
   const subtitle = getCmsString(content, ["subtitle", "sub_title"], "Meet The Digital Hub Team");
   const title = getCmsString(content, ["title", "heading"], "Our Core Team of Managers and Instructors").replace(/\binstructors?\b/gi, "Team");
   const description = getCmsString(
      content,
      ["description", "body"],
      "Meet the people behind Digital Hub programs, mentorship, and delivery. Our team supports learners from training to career readiness."
   );
   const ctaText = getCmsString(content, ["cta_text", "button_text"], "Meet The Full Team").replace(/\binstructors?\b/gi, "Team");
   const ctaLink = getCmsString(content, ["cta_link", "button_link"], "/team");
   const cardsLimit = Math.trunc(getCmsNumber(content, ["limit", "card_limit"], 3, 1, 24));
   const useCustomCards = getCmsString(content, ["source_mode"], "profiles").trim().toLowerCase() === "custom";
   const [profileCards, setProfileCards] = useState<DataType[]>([]);
   const [profilesLoading, setProfilesLoading] = useState<boolean>(!useCustomCards);
   const [activeCard, setActiveCard] = useState<DataType | null>(null);
   const [themeVars, setThemeVars] = useState<CssVars>({
      "--dh-instructor-fallback-start": DEFAULT_FALLBACK_GRADIENT.start,
      "--dh-instructor-fallback-mid": DEFAULT_FALLBACK_GRADIENT.mid,
      "--dh-instructor-fallback-end": DEFAULT_FALLBACK_GRADIENT.end,
   });

   const customCards = getCmsRecordArray(content, ["cards", "instructors"]).map((item, index) => {
      const fallback = instructor_data[index % instructor_data.length];
      const socialLinks = getCmsRecord(item, ["social", "socials"]);
      return {
         id: index + 1,
         thumb: getCmsString(item, ["image_url", "thumb"], "") || fallback.thumb,
         title: getCmsString(item, ["name", "title", "full_name"], fallback.title),
         designation: getCmsString(item, ["designation", "role", "expertise"], fallback.designation),
         bio: getCmsString(item, ["bio", "description"], fallback.bio),
         skills: buildSkillList(
            getCmsString(item, ["skills", "skill_list"], ""),
            getCmsString(item, ["designation", "role", "expertise"], fallback.designation)
         ),
         profileLink: getCmsString(item, ["profile_link", "link"], fallback.profileLink),
         socials: {
            linkedin: getCmsString(socialLinks, ["linkedin"], fallback.socials.linkedin),
            github: getCmsString(socialLinks, ["github"], fallback.socials.github),
            portfolio: getCmsString(socialLinks, ["portfolio"], fallback.socials.portfolio),
            twitter: getCmsString(socialLinks, ["twitter"], fallback.socials.twitter),
            instagram: getCmsString(socialLinks, ["instagram"], fallback.socials.instagram),
            youtube: getCmsString(socialLinks, ["youtube"], fallback.socials.youtube),
         },
      } satisfies DataType;
   });

   useEffect(() => {
      let active = true;
      const loadProfiles = async () => {
         if (useCustomCards) {
            setProfilesLoading(false);
            setProfileCards([]);
            return;
         }
         setProfilesLoading(true);
         try {
            const [managers, instructors] = await Promise.all([listPublicManagers(), listPublicInstructors()]);
            if (!active) return;
            const combined: DataType[] = [
               ...managers.map((manager) => ({
                  id: Number(`1${manager.user_id}`),
                  thumb: manager.avatar_url,
                  title: manager.full_name,
                  designation: manager.job_title || "Team Member",
                  bio: manager.bio || "Team member supporting Digital Hub programs and delivery.",
                  skills: buildSkillList(manager.skills, manager.job_title),
                  profileLink: "/team",
                  socials: {
                     linkedin: manager.linkedin_url ?? "",
                     github: manager.github_url ?? "",
                     portfolio: manager.portfolio_url ?? "",
                     twitter: "",
                     instagram: "",
                     youtube: "",
                  },
               })),
               ...instructors.map((instructor) => ({
                  id: Number(`2${instructor.user_id}`),
                  thumb: instructor.avatar_url,
                  title: instructor.full_name,
                  designation: instructor.expertise || "Instructor",
                  bio: instructor.bio || "Instructor supporting training and project mentorship.",
                  skills: buildSkillList(instructor.skills, instructor.expertise),
                  profileLink: "/team",
                  socials: {
                     linkedin: instructor.linkedin_url ?? "",
                     github: instructor.github_url ?? "",
                     portfolio: instructor.portfolio_url ?? "",
                     twitter: "",
                     instagram: "",
                     youtube: "",
                  },
               })),
            ];
            setProfileCards(combined);
         } catch {
            if (!active) return;
            setProfileCards([]);
         } finally {
            if (active) {
               setProfilesLoading(false);
            }
         }
      };
      void loadProfiles();
      return () => {
         active = false;
      };
   }, [useCustomCards]);

   useEffect(() => {
      let active = true;
      const loadTheme = async () => {
         try {
            const tokens = await getPublicThemeTokens();
            if (!active || !Array.isArray(tokens)) return;
            setThemeVars(buildFallbackGradientVars(tokens));
         } catch {
            if (!active) return;
            setThemeVars({
               "--dh-instructor-fallback-start": DEFAULT_FALLBACK_GRADIENT.start,
               "--dh-instructor-fallback-mid": DEFAULT_FALLBACK_GRADIENT.mid,
               "--dh-instructor-fallback-end": DEFAULT_FALLBACK_GRADIENT.end,
            });
         }
      };
      void loadTheme();
      return () => {
         active = false;
      };
   }, []);

   useEffect(() => {
      if (!activeCard) return;
      const previousOverflow = document.body.style.overflow;
      const onEscape = (event: KeyboardEvent) => {
         if (event.key === "Escape") {
            setActiveCard(null);
         }
      };
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onEscape);
      return () => {
         document.body.style.overflow = previousOverflow;
         window.removeEventListener("keydown", onEscape);
      };
   }, [activeCard]);

   const sourceCards = useMemo(() => {
      if (useCustomCards) {
         return customCards.length ? customCards : instructor_data;
      }
      return profileCards;
   }, [customCards, profileCards, useCustomCards]);

   const visibleCards = sourceCards.slice(0, cardsLimit);
   const showProfileSkeleton = !useCustomCards && profilesLoading;
   const skeletonCount = Math.max(2, Math.min(cardsLimit, 4));

   const normalizeUrl = (value: string) => {
      const raw = String(value || "").trim();
      if (!raw || raw === "#") return "";
      if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return raw;
      return `https://${raw}`;
   };

   const getInitials = (fullName: string) => {
      const source = String(fullName || "").trim();
      if (!source) return "DH";
      const parts = source.split(/\s+/).filter(Boolean);
      const first = parts[0]?.charAt(0) ?? "";
      const second = parts.length > 1 ? parts[1]?.charAt(0) ?? "" : parts[0]?.charAt(1) ?? "";
      const value = `${first}${second}`.trim();
      return value ? value.toUpperCase() : "DH";
   };

   const resolveImageSrc = (value: StaticImageData | string | null): StaticImageData | string | null => {
      if (!value) return null;
      if (typeof value !== "string") return value;
      if (!value.trim()) return null;
      if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
      if (value.startsWith("/uploads/")) return `${API_BASE_URL}${value}`;
      if (value.startsWith("/")) return value;
      return value;
   };

   const getActiveSocialItems = (socials: DataType["socials"]) =>
      ([
         { key: "linkedin", iconClass: "fab fa-linkedin-in", label: "LinkedIn", url: normalizeUrl(socials.linkedin) },
         { key: "github", iconClass: "fab fa-github", label: "GitHub", url: normalizeUrl(socials.github) },
         { key: "twitter", iconClass: "fab fa-twitter", label: "Twitter", url: normalizeUrl(socials.twitter) },
         { key: "instagram", iconClass: "fab fa-instagram", label: "Instagram", url: normalizeUrl(socials.instagram) },
         { key: "youtube", iconClass: "fab fa-youtube", label: "YouTube", url: normalizeUrl(socials.youtube) },
         { key: "portfolio", iconClass: "fas fa-link", label: "Portfolio", url: normalizeUrl(socials.portfolio) },
      ] as SocialItem[]).filter((entry) => Boolean(entry.url));

   const closeModal = () => setActiveCard(null);
   const activeCardSocials = activeCard ? getActiveSocialItems(activeCard.socials) : [];

   return (
      <>
         <section className="instructor__area" style={themeVars}>
            <div className="container">
               <div className="row align-items-center">
                  <div className="col-xl-4">
                     <div className="instructor__content-wrap">
                        <div className="section__title mb-15">
                           <span className="sub-title">{subtitle}</span>
                           <h2 className="title">{title}</h2>
                        </div>
                        <p>{description}</p>
                        <div className="tg-button-wrap">
                           <Link to={ctaLink} className="btn arrow-btn">{ctaText}<BtnArrow /></Link>
                        </div>
                     </div>
                  </div>

                  <div className="col-xl-8">
                     <div className="instructor__item-wrap">
                        <div className="row">
                           {showProfileSkeleton
                              ? Array.from({ length: skeletonCount }, (_, index) => (
                                 <div key={`team-card-skeleton-${index}`} className="col-sm-6">
                                    <div className="instructor__item people-team-card--skeleton" aria-hidden="true">
                                       <div className="instructor__thumb">
                                          <span className="people-team-card__avatar-skeleton" />
                                       </div>
                                       <div className="instructor__content">
                                          <span className="people-team-card__line people-team-card__line--title" />
                                          <span className="people-team-card__line people-team-card__line--role" />
                                          <div className="people-team-card__social-skeleton">
                                             <span className="people-team-card__icon-skeleton" />
                                             <span className="people-team-card__icon-skeleton" />
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              ))
                              : visibleCards.map((item) => {
                                 const activeSocialItems = getActiveSocialItems(item.socials);
                                 const imageSrc = resolveImageSrc(item.thumb);
                                 return (
                                    <div key={item.id} className="col-sm-6">
                                       <div className="instructor__item">
                                          <div className="instructor__thumb">
                                             <button type="button" className="dh-instructor-card__avatar-button" onClick={() => setActiveCard(item)} aria-label={`View ${item.title} profile`}>
                                                <div className="dh-instructor-card__avatar-wrap">
                                                   {imageSrc ? (
                                                      <Image className="dh-instructor-card__avatar-image" src={imageSrc} alt={item.title} />
                                                   ) : (
                                                      <span className="dh-instructor-card__avatar-fallback" aria-hidden="true">
                                                         {getInitials(item.title)}
                                                      </span>
                                                   )}
                                                </div>
                                             </button>
                                          </div>
                                          <div className="instructor__content">
                                             <h2 className="title">
                                                <button type="button" className="dh-instructor-card__name-btn" onClick={() => setActiveCard(item)}>
                                                   {item.title}
                                                </button>
                                             </h2>
                                             <span className="designation">{item.designation}</span>
                                             {activeSocialItems.length ? (
                                                <div className="instructor__social">
                                                   <ul className="list-wrap dh-instructor-card__social-list">
                                                      {activeSocialItems.map((social) => (
                                                         <li key={social.key} className={`dh-instructor-card__social-item dh-instructor-card__social-item--${social.key}`}>
                                                            <Link to={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                                                               <i className={social.iconClass}></i>
                                                            </Link>
                                                         </li>
                                                      ))}
                                                   </ul>
                                                </div>
                                             ) : null}
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         {activeCard ? (
            <div className="dh-team-modal" role="dialog" aria-modal="true" aria-label={`${activeCard.title} profile`} onClick={closeModal}>
               <div className="dh-team-modal__dialog" onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="dh-team-modal__close" onClick={closeModal} aria-label="Close profile modal">
                     <i className="fas fa-times" />
                  </button>
                  <div className="dh-team-modal__head">
                     <div className="dh-team-modal__avatar">
                        {resolveImageSrc(activeCard.thumb) ? (
                           <Image className="dh-team-modal__avatar-image" src={resolveImageSrc(activeCard.thumb)!} alt={activeCard.title} />
                        ) : (
                           <span className="dh-team-modal__avatar-fallback" aria-hidden="true">
                              {getInitials(activeCard.title)}
                           </span>
                        )}
                     </div>
                     <div className="dh-team-modal__identity">
                        <h3>{activeCard.title}</h3>
                        <p>{activeCard.designation}</p>
                     </div>
                  </div>

                  {activeCard.bio ? <p className="dh-team-modal__bio">{activeCard.bio}</p> : null}

                  {activeCard.skills.length ? (
                     <div className="dh-team-modal__skills">
                        {activeCard.skills.map((skill) => (
                           <span key={`${activeCard.id}-${skill}`}>{skill}</span>
                        ))}
                     </div>
                  ) : null}

                  {activeCardSocials.length ? (
                     <ul className="list-wrap dh-team-modal__social-list">
                        {activeCardSocials.map((social) => (
                           <li key={`modal-social-${social.key}`} className={`dh-instructor-card__social-item dh-instructor-card__social-item--${social.key}`}>
                              <Link to={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                                 <i className={social.iconClass}></i>
                              </Link>
                           </li>
                        ))}
                     </ul>
                  ) : null}

                  <div className="dh-team-modal__actions">
                     <Link to="/contact" className="btn arrow-btn dh-team-modal__contact-btn">
                        Contact
                        <BtnArrow />
                     </Link>
                  </div>
               </div>
            </div>
         ) : null}
      </>
   )
}

export default Instructor

