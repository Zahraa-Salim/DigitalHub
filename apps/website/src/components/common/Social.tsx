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
  email: "/assets/img/icons/email.svg",
  github: "/assets/img/icons/github.svg",
  linkedin: "/assets/img/icons/linkedin.svg",
  facebook: "/assets/img/icons/facebook.svg",
  instagram: "/assets/img/icons/instagram.svg",
  whatsapp: "/assets/img/icons/whatsapp.svg",
  twitter: "/assets/img/icons/twitter.svg",
  youtube: "/assets/img/icons/youtube.svg",
};


const Social = ({ socials }: Props) => {
  let finalSocials: SocialItem[] = DEFAULT_SOCIALS;

  if (socials && socials.length > 0) {
    finalSocials = socials
      .filter((s) => ICON_MAP[s.name.toLowerCase()])
      .map((s) => ({
        name: s.name.toLowerCase(),
        url: s.url,
        icon: ICON_MAP[s.name.toLowerCase()],
      }));
  }

  return (
    <>
      {finalSocials.map((social) => (
        <li key={social.name}>
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


