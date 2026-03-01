// File: src/components/common/Social.tsx
// Purpose: UI component responsible for rendering part of the interface (common/Social.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import Link from "@/components/common/Link";
import InjectableSvg from "@/hooks/InjectableSvg";

interface DbSocialItem {
  name: string;
  url: string;
}

interface SocialItem {
  name: string;
  url: string;
  icon: string;
}

interface Props {
  socials?: DbSocialItem[];
}

/* ================= DEFAULT SOCIALS ================= */
const DEFAULT_SOCIALS: SocialItem[] = [
  {
    name: "gmail",
    url: "mailto:info@thedigitalhub.com",
    icon: "/assets/img/icons/gmail.svg",
  },
  {
    name: "github",
    url: "https://github.com/",
    icon: "/assets/img/icons/github.svg",
  },
  {
    name: "linkedin",
    url: "https://www.linkedin.com/",
    icon: "/assets/img/icons/linkedin.svg",
  },
];
/* =================================================== */

/* map DB social -> icon */
const ICON_MAP: Record<string, string> = {
  email: "/assets/img/icons/emial.svg",
  mail: "/assets/img/icons/emial.svg",
  github: "/assets/img/icons/github.svg",
  git: "/assets/img/icons/github.svg",
  linkedin: "/assets/img/icons/linkedin.svg",
  linkedincom: "/assets/img/icons/linkedin.svg",
  facebook: "/assets/img/icons/facebook.svg",
  instagram: "/assets/img/icons/instagram.svg",
  whatsapp: "/assets/img/icons/whatsapp.svg",
  twitter: "/assets/img/icons/twitter.svg",
  youtube: "/assets/img/icons/youtube.svg",
};

const normalizeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const resolveIcon = (item: DbSocialItem): string | null => {
  const key = normalizeName(item.name || "");
  if (ICON_MAP[key]) return ICON_MAP[key];

  const url = (item.url || "").toLowerCase();
  if (url.includes("github.com")) return ICON_MAP.github;
  if (url.includes("linkedin.com")) return ICON_MAP.linkedin;
  if (url.startsWith("mailto:")) return ICON_MAP.email;
  if (url.includes("facebook.com")) return ICON_MAP.facebook;
  if (url.includes("instagram.com")) return ICON_MAP.instagram;
  if (url.includes("twitter.com") || url.includes("x.com")) return ICON_MAP.twitter;
  if (url.includes("youtube.com") || url.includes("youtu.be")) return ICON_MAP.youtube;
  if (url.includes("wa.me") || url.includes("whatsapp")) return ICON_MAP.whatsapp;

  return null;
};

const Social = ({ socials }: Props) => {
  let finalSocials: SocialItem[] = DEFAULT_SOCIALS;

  if (socials && socials.length > 0) {
    finalSocials = socials
      .map((s) => {
        const icon = resolveIcon(s);
        if (!icon) return null;
        return {
          name: normalizeName(s.name || "social"),
          url: s.url,
          icon,
        };
      })
      .filter((s): s is SocialItem => s !== null)
      .map((s) => ({
        name: s.name,
        url: s.url,
        icon: s.icon,
      }));
  }

  return (
    <>
      {finalSocials.map((social) => (
        <li key={social.name} className={`social-item social-item--${social.name}`}>
          <Link to={social.url} target="_blank">
            <InjectableSvg
              src={social.icon}
              alt={social.name}
              className="injectable"
            />
          </Link>
        </li>
      ))}
    </>
  );
};

export default Social;


