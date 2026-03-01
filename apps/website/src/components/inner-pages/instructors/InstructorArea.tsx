"use client";

import React, { useEffect, useState } from "react";
import Image from "@/components/common/Image";
import Link from "@/components/common/Link";

type ApiPerson = {
  user_id: number;
  full_name: string;
  job_title?: string | null;
  expertise?: string | null;
  linkedin_url?: string | null;
  avatar_url?: string | null;
};

type TeamMember = {
  id: number;
  name: string;
  position: string;
  linkedinUrl: string | null;
  photoUrl: string | null;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const fallbackThumb = "/assets/img/instructor/instructor01.png";

function normalizeLinkedIn(url: string) {
  const v = (url || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

function getArrayPayload<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: T[] }).data)) {
    return (raw as { data: T[] }).data;
  }
  return [];
}

function mapPerson(item: ApiPerson): TeamMember {
  return {
    id: item.user_id,
    name: item.full_name,
    position: item.job_title || item.expertise || "Team Member",
    linkedinUrl: item.linkedin_url ?? null,
    photoUrl: item.avatar_url ?? null,
  };
}

export default function InstructorArea() {
  const [items, setItems] = useState<TeamMember[]>([]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const [managersRes, instructorsRes] = await Promise.all([
          fetch(`${API_BASE}/public/managers`, { cache: "no-store" }),
          fetch(`${API_BASE}/public/instructors`, { cache: "no-store" }),
        ]);

        const managersRaw = managersRes.ok ? await managersRes.json() : [];
        const instructorsRaw = instructorsRes.ok ? await instructorsRes.json() : [];

        const managers = getArrayPayload<ApiPerson>(managersRaw);
        const instructors = getArrayPayload<ApiPerson>(instructorsRaw);

        setItems([...managers, ...instructors].map(mapPerson));
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
                          <Link to={normalizeLinkedIn(item.linkedinUrl)} target="_blank" rel="noopener noreferrer">
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
