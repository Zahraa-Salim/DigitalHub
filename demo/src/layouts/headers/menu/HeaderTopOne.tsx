"use client";

import { useEffect, useState } from "react";
import Image from "@/components/common/Image";
import Link from "@/components/common/Link";

import icon_1 from "@/assets/img/icons/map_marker.svg";
import icon_2 from "@/assets/img/icons/envelope.svg";
import icon_3 from "@/assets/img/icons/phone.svg";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

interface StyleType {
  style?: boolean;
}

type ContactInfo = {
  address: string;
  phone: string;
  email: string;
};

const DEFAULTS: ContactInfo = {
  address: "Abdo Rd À do",
  phone: "76410693",
  email: "abdelhadishams2@gmail.com",
};

const HeaderTopOne = ({ style }: StyleType) => {
  const [info, setInfo] = useState<ContactInfo>(DEFAULTS);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/contact-info`, {
          credentials: "include",
        });

        if (!res.ok) return;

        const text = await res.text();
        if (!text || !text.trim()) return;

        const data = JSON.parse(text);

        setInfo({
          address: data.address ?? DEFAULTS.address,
          phone: data.phone ?? DEFAULTS.phone,
          email: data.email ?? DEFAULTS.email,
        });
      } catch (err) {
        console.error("Header contact info fetch failed:", err);
      }
    };

    fetchContactInfo();
  }, []);

  // handle multiline address
  const address = info.address.replace(/\n/g, ", ");

  return (
    <div className="tg-header__top">
      <div className={`container ${style ? "" : "custom-container"}`}>
        <div className="row">
          <div className="col-lg-6">
            <ul className="tg-header__top-info list-wrap">
              <li>
                <Image src={icon_1} alt="Icon" />
                <span>{address}</span>
              </li>
              <li>
                <Image src={icon_2} alt="Icon" />
                <Link to={`mailto:${info.email}`}>{info.email}</Link>
              </li>
            </ul>
          </div>

          <div className="col-lg-6">
            <div className="tg-header__top-right">
              <div className="tg-header__phone">
                <Image src={icon_3} alt="Icon" />
                Call us:&nbsp;
                <Link to={`tel:${info.phone}`}>{info.phone}</Link>
              </div>

              <ul className="tg-header__top-social list-wrap">
                <li>Follow Us On :</li>
             
                <li><Link to="https://www.linkedin.com/company/the-digital-hub-unrwa/" target="_blank"><i className="fab fa-linkedin-in" /></Link></li>
                
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderTopOne;


