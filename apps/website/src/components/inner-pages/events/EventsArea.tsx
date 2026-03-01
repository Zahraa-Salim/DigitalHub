// File: src/components/inner-pages/events/EventsArea.tsx
// Purpose: UI component responsible for rendering part of the interface (inner-pages/events/EventsArea.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";

type EventCard = {
  id: number;
  title: string;
  dateLabel: string;
  location: string;
  image: string;
};

const events: EventCard[] = [
  {
    id: 1,
    title: "AI Product Sprint and Demo Day",
    dateLabel: "Mar 06, 2026",
    location: "Beirut Digital District",
    image: "/assets/img/events/event_thumb01.jpg",
  },
  {
    id: 2,
    title: "Frontend Performance Masterclass",
    dateLabel: "Mar 14, 2026",
    location: "The Digital Hub Campus",
    image: "/assets/img/events/event_thumb02.jpg",
  },
  {
    id: 3,
    title: "Data and Automation for Teams",
    dateLabel: "Mar 21, 2026",
    location: "Online Live Session",
    image: "/assets/img/events/event_thumb03.jpg",
  },
  {
    id: 4,
    title: "Career Growth Night for Developers",
    dateLabel: "Apr 03, 2026",
    location: "Downtown, Beirut",
    image: "/assets/img/events/event_thumb04.jpg",
  },
  {
    id: 5,
    title: "Startup Pitch Clinic and Mentorship",
    dateLabel: "Apr 17, 2026",
    location: "The Digital Hub Campus",
    image: "/assets/img/events/event_thumb05.jpg",
  },
  {
    id: 6,
    title: "Cybersecurity Essentials Bootcamp",
    dateLabel: "Apr 29, 2026",
    location: "Hybrid Event",
    image: "/assets/img/events/event_thumb06.jpg",
  },
];

const EventsArea = () => {
  return (
    <section className="event__area section-py-120">
      <div className="container">
        <div className="section__title-wrap mb-35">
          <div className="row align-items-end">
            <div className="col-lg-8">
              <div className="section__title">
                <span className="sub-title">Upcoming Events</span>
                <h2 className="title">
                  Join the next sessions at <span>The Digital Hub</span>
                </h2>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="section__content">
                <p>
                  Workshops, talks, and hands-on learning experiences curated for
                  participants, teams, and professionals.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="event__item-wrap">
          <div className="row">
            {events.map((event, index) => (
              <div
                className="col-lg-4 col-md-6"
                key={event.id}
                data-aos="fade-up"
                data-aos-delay={(index % 3) * 100}
              >
                <div className="event__item">
                  <div className="event__item-thumb">
                    <Image src={event.image} alt={event.title} />
                  </div>
                  <div className="event__item-content">
                    <span className="date">{event.dateLabel}</span>
                    <h2 className="title">
                      <Link to="/contact">{event.title}</Link>
                    </h2>
                    <Link to="/contact" className="location">
                      <i className="fas fa-map-marker-alt"></i>
                      {event.location}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventsArea;
