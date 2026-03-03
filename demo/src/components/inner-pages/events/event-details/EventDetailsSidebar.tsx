"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useState } from "react";

import calendarIcon from "@/assets/img/icons/calendar.svg";
import locationIcon from "@/assets/img/icons/course_icon02.svg";
import topicIcon from "@/assets/img/icons/course_icon03.svg";
import timeIcon from "@/assets/img/icons/course_icon04.svg";
import calendarevent from "@/assets/img/icons/calendar-event.svg";

/* ================= TYPES ================= */

type Props = {
  startDate: string;
  endDate?: string;
  location?: string;
  instructorLinkedIn?: string;
  topics?: string[];
  typeEvent?: string;
};

export default function EventDetailsSidebar({
  startDate,
  endDate,
  location,
  instructorLinkedIn,
  topics = [],
  typeEvent,
}: Props) {
  const [openTopics, setOpenTopics] = useState(false);

  const start = new Date(startDate);
  const now = new Date();
  const isUpcoming = start > now;

  const startTime = start.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endTime =
    endDate && new Date(endDate) > start
      ? new Date(endDate).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <aside className="event__sidebar">
      <div className="event__widget">
        <div className="courses__details-sidebar">

          <div className="courses__information-wrap">
            <h5 className="title">Event Information:</h5>

            <ul className="list-wrap">

              {/* Date */}
              <li>
                <Image src={calendarIcon} alt="Date" />
                Date
                <span>{start.toLocaleDateString("en-GB")}</span>
              </li>

              {/* Time */}
              <li>
                <Image src={timeIcon} alt="Time" />
                Time
                <span>
                  {startTime}
                  {endTime && ` → ${endTime}`}
                </span>
              </li>

              {/* Status */}
              <li>
                <span style={{ fontSize: "13px", opacity: 0.7 }}>
                  {isUpcoming
                    ? "This event will be available soon"
                    : "This event is available for students"}
                </span>
              </li>

              {/* Event Type (NEW – same style as Location) */}
              {typeEvent && (
                <li>
                  <Image src={calendarevent} alt="Event Type" />
                  Event Type
                  <span>{typeEvent}</span>
                </li>
              )}

              {/* Location */}
              {location && (
                <li>
                  <Image src={locationIcon} alt="Location" />
                  Location
                  <span>{location}</span>
                </li>
              )}

              {/* Topics */}
              {topics.length > 0 && (
                <li
                  style={{ cursor: "pointer" }}
                  onClick={() => setOpenTopics(!openTopics)}
                >
                  <Image src={topicIcon} alt="Topics" />
                  Topics
                  <span>{topics.length}</span>
                </li>
              )}
            </ul>

            {openTopics && (
              <ul className="about__info-list list-wrap mt-15">
                {topics.map((topic, index) => (
                  <li key={index} className="about__info-list-item">
                    <i className="flaticon-angle-right"></i>
                    <p className="content">{topic}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Instructor */}
          {instructorLinkedIn && (
            <div className="courses__details-social">
              <h5 className="title">Instructor:</h5>
              <ul className="list-wrap">
                <li>
                  <Link to={instructorLinkedIn} target="_blank">
                    <i className="fab fa-linkedin"></i>
                  </Link>
                </li>
              </ul>
            </div>
          )}

        </div>
      </div>
    </aside>
  );
}


