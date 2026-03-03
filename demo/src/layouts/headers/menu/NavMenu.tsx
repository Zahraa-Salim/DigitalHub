"use client";

import Link from "@/components/common/Link";
import { usePathname } from "@/utils/navigation";
import menu_data from "@/data/home-data/MenuData";

const NavMenu = () => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <ul className="navigation">
      {menu_data.map((menu) => (
        <li key={menu.id} className={isActive(menu.link) ? "active" : ""}>
          <Link to={menu.link}>{menu.title}</Link>
        </li>
      ))}
    </ul>
  );
};

export default NavMenu;


