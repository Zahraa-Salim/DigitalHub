// File: frontend/src/layouts/header/navData.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
export type MenuItem = {
  id: string;
  title: string;
  link: string;
  children?: MenuItem[];
};

export const DEFAULT_MENU_DATA: MenuItem[] = [
  { id: "home", title: "Home", link: "/" },
  { id: "programs", title: "Programs", link: "/programs" },
  {
    id: "about",
    title: "About",
    link: "/about-us",
    children: [
      { id: "about-mission", title: "Mission", link: "/about-us" },
      { id: "about-team", title: "Team", link: "/team" },
      { id: "about-events", title: "Events", link: "/events" },
    ],
  },
  { id: "participants", title: "Participants", link: "/participants" },
  { id: "contact", title: "Contact", link: "/contact" },
];
