// File: src/components/inner-pages/instructors/InstructorArea.tsx
// Purpose: UI component responsible for rendering part of the interface (inner-pages/instructors/InstructorArea.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import React, { useEffect, useState } from "react";
import Image from "@/components/common/Image";
import Link from "@/components/common/Link";

type TeamMember = {
  id: number;
  name: string;
  position: string;
  linkedinUrl: string | null;
  photoUrl: string | null;
  isActive: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const fallbackThumb = "/assets/img/instructor/instructor01.png";

function normalizeLinkedIn(url: string) {
  const v = (url || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

function getArrayPayload(raw: any): TeamMember[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

export default function InstructorArea() {
  const [items, setItems] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch(`${API_BASE}/team`, { cache: "no-store" });
        if (!res.ok) {
          setItems([]);
          return;
        }

        const raw = await res.json();
        const arr = getArrayPayload(raw);

        setItems(arr.filter((x) => x.isActive));
      } catch {
        setItems([]);
      }
    };

    fetchTeam();
  }, []);

  const photoSrc = (m: TeamMember) => {
    if (!m.photoUrl) return fallbackThumb;
    if (m.photoUrl.startsWith("http")) return m.photoUrl;
    return `${API_BASE}${m.photoUrl}`;
  };

  return (
    <section className="instructor__area">
      <div className="container">
        <div className="row">
          {items.map((item) => (
            <div key={item.id} className="col-xl-4 col-sm-6">
              <div className="instructor__item">
                <div className="instructor__thumb">
  <div
    style={{
      width: "180px",
      height: "180px",
      borderRadius: "50%",
      overflow: "hidden",
      margin: "0 auto",
    }}
  >
    <img
      src={photoSrc(item)}
      alt={item.name}
      loading="lazy"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  </div>
</div>


                <div className="instructor__content">
                  <h2 className="title">{item.name}</h2>
                  <span className="designation">{item.position}</span>

                  <div className="instructor__social">
                    <ul className="list-wrap">
                      {item.linkedinUrl ? (
                        <li>
                          <Link
                            to={normalizeLinkedIn(item.linkedinUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i className="fab fa-linkedin-in"></i>
                          </Link>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
