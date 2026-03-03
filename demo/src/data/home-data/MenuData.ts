export interface MenuItem {
  id: number;
  title: string;
  link: string;
}

const menu_data: MenuItem[] = [
  {
    id: 1,
    title: "Home",
    link: "/",
  },
  {
    id: 2,
    title: "Programs",
    link: "/courses",
  },
  {
    id: 3,
    title: "Events",
    link: "/events",
  },
  {
    id: 4,
    title: "About Us",
    link: "/about-us",
  },
  {
    id: 5,
    title: "Instructors",
    link: "/instructors",
  },
  {
    id: 6,
    title: "Contact",
    link: "/contact",
  },
];

export default menu_data;
