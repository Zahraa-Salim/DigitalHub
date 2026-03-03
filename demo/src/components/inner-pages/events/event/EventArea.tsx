"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";

/* ================= TYPES ================= */

type Program = {
  id: number;
  title: string;
};

type EventItem = {
  id: number;
  title: string;
  slug: string;
  coverImage: string | null;
  startDate: string;
  location: string;
  type: string;
  program?: Program;        // 👈 
  programs?: Program[];     // 👈 
};


/* ================= CONFIG ================= */

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const API_URL = `${BASE_URL}/events`;

/* ================= COMPONENT ================= */

const EventArea = () => {
  const itemsPerPage = 8;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [itemOffset, setItemOffset] = useState(0);

  useEffect(() => {
    fetch(API_URL, { cache: "no-store" })
      .then((res) => res.json())
      .then(setEvents)
      .catch(() => {});
  }, []);

  const now = new Date();

  const endOffset = itemOffset + itemsPerPage;
  const currentItems = events.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(events.length / itemsPerPage);

  const handlePageClick = (event: any) => {
    setItemOffset((event.selected * itemsPerPage) % events.length);
  };

  return (
    <section className="event__area-two section-py-120">
      <div className="container">
        <div className="event__inner-wrap">
          <div className="row justify-content-center">

            {currentItems.map((item) => {
              const isUpcoming = new Date(item.startDate) > now;

              return (
                <div key={item.id} className="col-xl-3 col-lg-4 col-md-6">
                  <div className="event__item shine__animate-item">

                    {/* IMAGE */}
                    <div className="event__item-thumb">
                      <Link to={`/events/${item.slug}`}>
                        <Image
                          src={
                            item.coverImage
                              ? `${BASE_URL}/uploads/events/${item.coverImage}`
                              : "/images/event-placeholder.jpg"
                          }
                          alt={item.title}
                          width={400}
                          height={300}
                        />
                      </Link>
                    </div>

                    {/* CONTENT */}
                    <div className="event__item-content">

                      {/* DATE */}
                      <span className="date">
                        {new Date(item.startDate).toLocaleDateString("en-GB")}
                        {" • "}
                        {isUpcoming ? "Upcoming" : "Available"}
                      </span>

                      {/* TITLE */}
                      <h2 className="title">
                        <Link to={`/events/${item.slug}`}>
                          {item.title}
                        </Link>
                      </h2>

                      {/* TYPE + PROGRAMS */}
                    <div className="event__meta-tags">

  {/* Event Type */}
  {item.type && (
    <span className="event__tag event__tag--type">
      {item.type}
    </span>
  )}

  {/* Single Program (current API) */}
  {item.program && (
    <span className="event__tag event__tag--program">
      {item.program.title}
    </span>
  )}

  {/* Multiple Programs (future-ready) */}
  {item.programs &&
    item.programs.map((p) => (
      <span
        key={p.id}
        className="event__tag event__tag--program"
      >
        {p.title}
      </span>
    ))}
</div>


                      {/* LOCATION */}
                      {item.location && (
                        <Link
                          to="https://maps.google.com/maps"
                          className="location"
                          target="_blank"
                        >
                          <i className="flaticon-map"></i>
                          {item.location}
                        </Link>
                      )}

                    </div>
                  </div>
                </div>
              );
            })}

          </div>

          {/* PAGINATION */}
          <nav className="pagination__wrap mt-30">
            <ReactPaginate
              breakLabel="..."
              onPageChange={handlePageClick}
              pageRangeDisplayed={3}
              pageCount={pageCount}
              renderOnZeroPageCount={null}
              className="list-wrap"
            />
          </nav>
        </div>
      </div>
    </section>
  );
};

export default EventArea;


