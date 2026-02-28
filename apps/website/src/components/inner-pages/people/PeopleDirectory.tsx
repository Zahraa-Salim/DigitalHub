// File: src/components/inner-pages/people/PeopleDirectory.tsx
// Purpose: UI component responsible for rendering part of the interface (inner-pages/people/PeopleDirectory.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useMemo, useState } from "react";
import type { PeopleMode } from "@/data/mock/peopleDirectoryData";
import { peopleData } from "@/data/mock/peopleDirectoryData";

type PeopleDirectoryProps = {
  mode: PeopleMode;
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


