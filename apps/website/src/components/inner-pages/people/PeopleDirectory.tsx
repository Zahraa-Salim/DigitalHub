// File: src/components/inner-pages/people/PeopleDirectory.tsx
// Purpose: UI component responsible for rendering part of the interface (inner-pages/people/PeopleDirectory.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useEffect, useMemo, useState } from "react";
import type { PeopleMode } from "@/data/mock/peopleDirectoryData";
import { peopleData } from "@/data/mock/peopleDirectoryData";
import axiosInstance from "@/lib/axios";

type PeopleDirectoryProps = {
  mode: PeopleMode;
};

type PublicAdminProfile = {
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
};

const modeText = {
  participants: {
    allPrimary: "All Tracks",
    allSecondary: "All Cohorts",
    cta: "View Profile",
  },
  team: {
    allPrimary: "All Departments",
    allSecondary: "All Locations",
    cta: "Contact Member",
  },
};

const sortByName = (a: string, b: string) => a.localeCompare(b);

const PeopleDirectory = ({ mode }: PeopleDirectoryProps) => {
  const source = useMemo(
    () => peopleData.filter((item) => item.mode === mode).sort((a, b) => a.order - b.order),
    [mode]
  );

  const [selectedPrimary, setSelectedPrimary] = useState<string[]>([]);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState("default");
  const [publicAdmins, setPublicAdmins] = useState<PublicAdminProfile[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminsError, setAdminsError] = useState("");

  useEffect(() => {
    if (mode !== "team") {
      return;
    }

    let active = true;

    const loadPublicAdmins = async () => {
      setLoadingAdmins(true);
      setAdminsError("");
      try {
        const response = await axiosInstance.get<{ success: true; data: PublicAdminProfile[] }>("/api/public/admins");
        if (active) {
          setPublicAdmins(Array.isArray(response.data?.data) ? response.data.data : []);
        }
      } catch {
        if (active) {
          setAdminsError("Failed to load team members.");
        }
      } finally {
        if (active) {
          setLoadingAdmins(false);
        }
      }
    };

    void loadPublicAdmins();

    return () => {
      active = false;
    };
  }, [mode]);

  const primaryOptions = useMemo(
    () => Array.from(new Set(source.map((item) => item.primaryTag))).sort(sortByName),
    [source]
  );

  const secondaryOptions = useMemo(
    () => Array.from(new Set(source.map((item) => item.secondaryTag))).sort(sortByName),
    [source]
  );

  const toggleMulti = (value: string, state: string[], setState: (v: string[]) => void) => {
    if (state.includes(value)) {
      setState(state.filter((x) => x !== value));
      return;
    }
    setState([...state, value]);
  };

  const filteredItems = useMemo(() => {
    let items = [...source];

    if (selectedPrimary.length > 0) {
      items = items.filter((item) => selectedPrimary.includes(item.primaryTag));
    }

    if (selectedSecondary.length > 0) {
      items = items.filter((item) => selectedSecondary.includes(item.secondaryTag));
    }

    switch (sortValue) {
      case "name_asc":
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        items.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "available_first":
        items.sort((a, b) => Number(b.status === "Available" || b.status === "Open to Work") - Number(a.status === "Available" || a.status === "Open to Work"));
        break;
      default:
        items.sort((a, b) => a.order - b.order);
    }

    return items;
  }, [selectedPrimary, selectedSecondary, sortValue, source]);

  if (mode === "team") {
    return (
      <section className="people-directory section-py-120">
        <div className="container">
          <div className="people-toolbar">
            <p className="people-toolbar__count">
              Showing {publicAdmins.length} team members
            </p>
          </div>

          {adminsError ? <p className="people-empty">{adminsError}</p> : null}
          {loadingAdmins ? <p className="people-empty">Loading team members...</p> : null}

          {!loadingAdmins && !adminsError ? (
            <div className="row g-4">
              {publicAdmins.map((item, index) => (
                <div key={`${item.full_name}-${index}`} className="col-xl-4 col-md-6">
                  <article className="people-card" data-aos="fade-up" data-aos-delay={(index % 3) * 100}>
                    <div className="people-card__head">
                      <div className="people-card__avatar">
                        {item.avatar_url ? (
                          <Image src={item.avatar_url} alt={item.full_name} />
                        ) : (
                          <div className="people-card__avatar-fallback" aria-hidden>
                            {item.full_name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <h4 className="people-card__name">{item.full_name}</h4>
                    <p className="people-card__role">{item.job_title || "Team Member"}</p>
                    <p className="people-card__bio">{item.bio || "No biography available yet."}</p>
                    <div className="people-card__tags">
                      {item.linkedin_url ? (
                        <Link to={item.linkedin_url} target="_blank" rel="noreferrer">
                          LinkedIn
                        </Link>
                      ) : null}
                      {item.github_url ? (
                        <Link to={item.github_url} target="_blank" rel="noreferrer">
                          GitHub
                        </Link>
                      ) : null}
                      {item.portfolio_url ? (
                        <Link to={item.portfolio_url} target="_blank" rel="noreferrer">
                          Portfolio
                        </Link>
                      ) : null}
                    </div>
                  </article>
                </div>
              ))}
              {!publicAdmins.length ? (
                <div className="col-12">
                  <p className="people-empty">No public team profiles available.</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="people-directory section-py-120">
      <div className="container">
        <div className="row">
          <div className="col-xl-3 col-lg-4">
            <aside className="people-filters">
              <div className="people-filters__card">
                <h4 className="people-filters__title">{modeText[mode].allPrimary}</h4>
                <ul className="people-filters__list list-wrap">
                  <li>
                    <label className="people-filter-check">
                      <input
                        type="checkbox"
                        checked={selectedPrimary.length === 0}
                        onChange={() => setSelectedPrimary([])}
                      />
                      <span>{modeText[mode].allPrimary}</span>
                    </label>
                  </li>
                  {primaryOptions.map((item) => (
                    <li key={item}>
                      <label className="people-filter-check">
                        <input
                          type="checkbox"
                          checked={selectedPrimary.includes(item)}
                          onChange={() => toggleMulti(item, selectedPrimary, setSelectedPrimary)}
                        />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="people-filters__card">
                <h4 className="people-filters__title">{modeText[mode].allSecondary}</h4>
                <ul className="people-filters__list list-wrap">
                  <li>
                    <label className="people-filter-check">
                      <input
                        type="checkbox"
                        checked={selectedSecondary.length === 0}
                        onChange={() => setSelectedSecondary([])}
                      />
                      <span>{modeText[mode].allSecondary}</span>
                    </label>
                  </li>
                  {secondaryOptions.map((item) => (
                    <li key={item}>
                      <label className="people-filter-check">
                        <input
                          type="checkbox"
                          checked={selectedSecondary.includes(item)}
                          onChange={() =>
                            toggleMulti(item, selectedSecondary, setSelectedSecondary)
                          }
                        />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>

          <div className="col-xl-9 col-lg-8">
            <div className="people-toolbar">
              <p className="people-toolbar__count">
                Showing {filteredItems.length} of {source.length}
              </p>

              <div className="people-toolbar__sort">
                <span>Sort By:</span>
                <select value={sortValue} onChange={(e) => setSortValue(e.target.value)}>
                  <option value="default">Default</option>
                  <option value="available_first">Availability</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                </select>
              </div>
            </div>

            <div className="row g-4">
              {filteredItems.map((item, index) => (
                <div key={item.id} className="col-xl-4 col-md-6">
                  <article
                    className="people-card"
                    data-aos="fade-up"
                    data-aos-delay={(index % 3) * 100}
                  >
                    <div className="people-card__head">
                      <div className="people-card__avatar">
                        <Image src={item.avatar} alt={item.name} />
                      </div>
                      <span
                        className={`people-card__status ${
                          item.status === "Available" || item.status === "Open to Work"
                            ? "is-open"
                            : "is-busy"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h4 className="people-card__name">{item.name}</h4>
                    <p className="people-card__role">{item.role}</p>
                    <p className="people-card__bio">{item.bio}</p>

                    <div className="people-card__tags">
                      <span>{item.primaryTag}</span>
                      <span>{item.secondaryTag}</span>
                    </div>

                    <Link to="/contact" className="people-card__cta">
                      {modeText[mode].cta}
                    </Link>
                  </article>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="col-12">
                  <p className="people-empty">No records match your selected filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PeopleDirectory;
