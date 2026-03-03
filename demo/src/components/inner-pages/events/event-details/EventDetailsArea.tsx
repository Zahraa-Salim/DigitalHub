"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useEffect, useState } from "react";
import { useParams } from "@/utils/navigation";
import EventDetailsSidebar from "./EventDetailsSidebar";

import event_details_img2 from "@/assets/img/courses/course_author001.png";
import event_details_img3 from "@/assets/img/events/event_details_img02.jpg";

/* ================= TYPES ================= */

type Program = {
  id: number;
  title: string;
};

type EventDetails = {
  title: string;
  description?: string;
  learningOutcomes?: string;

 
  topics?: string[];

  instructorName?: string;
  instructorLinkedIn?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  coverImage?: string;

 
  type?: string;


  program?: Program;
  programs?: Program[];
};

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function EventDetailsArea() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetails | null>(null);

  useEffect(() => {
    if (!slug) return;

    fetch(`${BASE_URL}/events/${slug}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setEvent);
  }, [slug]);

  if (!event) return null;

  // 🔑 توحيد البرامج (واحد أو Array)
  const programs: Program[] = event.program
    ? [event.program]
    : event.programs ?? [];

  return (
    <section className="event__details-area section-py-120">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">

            {/* COVER */}
            <div className="event__details-thumb">
              <Image
                src={
                  event.coverImage
                    ? `${BASE_URL}/uploads/events/${event.coverImage}`
                    : event_details_img3
                }
                alt="Event"
                width={1200}
                height={500}
              />
            </div>

            <div className="event__details-content-wrap">
              <div className="row">

                {/* LEFT */}
                <div className="col-70">
                  <div className="event__details-content">

                    <h2 className="title">{event.title}</h2>

                    {/* META */}
                    <div className="event__meta">
                      <ul className="list-wrap">
                        {event.instructorName && (
                          <li className="author">
                            {/* <Image src={event_details_img2} alt="Instructor" /> */}
                            By{" "}
                            {event.instructorLinkedIn ? (
                              <Link
                                to={event.instructorLinkedIn}
                                target="_blank"
                              >
                                {event.instructorName}
                              </Link>
                            ) : (
                              <span>{event.instructorName}</span>
                            )}
                          </li>
                        )}

                        {event.location && (
                          <li className="location">
                            <i className="flaticon-placeholder"></i>
                            {event.location}
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* OVERVIEW */}
                    {event.description && (
                      <div className="event__details-overview">
                        <h4 className="title-two">Event Overview</h4>
                        <p>{event.description}</p>
                      </div>
                    )}

                    {/* LEARNING */}
                    {event.learningOutcomes && (
                      <>
                        <h4 className="title-two">
                          What you&apos;ll learn in this event?
                        </h4>
                        <p>{event.learningOutcomes}</p>
                      </>
                    )}

                    {/* ✅ PROGRAM (بديل Topics) */}
                    {programs.length > 0 && (
                      <div className="event__details-inner">
                        <h4 className="title-two">Program</h4>
                        <ul className="about__info-list list-wrap">
                          {programs.map((p) => (
                            <li key={p.id} className="about__info-list-item">
                              <i className="flaticon-angle-right"></i>
                              <p className="content">{p.title}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>
                </div>

                {/* RIGHT / SIDEBAR */}
                <div className="col-30">
                  <EventDetailsSidebar
                    startDate={event.startDate}
                    endDate={event.endDate}
                    location={event.location}
                    instructorLinkedIn={event.instructorLinkedIn}
                    topics={event.topics}      
                    typeEvent={event.type}     
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}


/////
// "use client";

// import Image from "@/components/common/Image";
// import Link from "@/components/common/Link";
// import { useEffect, useState } from "react";
// import { useParams } from "@/utils/navigation";
// import EventDetailsSidebar from "./EventDetailsSidebar";

// import fallbackCover from "@/assets/img/events/event_details_img02.jpg";

// type EventDetails = {
//   title: string;
//   description?: string;
//   learningOutcomes?: string;
//   topics?: string[];
//   instructorName?: string;
//   instructorLinkedIn?: string;
//   startDate: string;
//   endDate?: string;
//   location?: string;
//   coverImage?: string;
// };

// const BASE_URL =
//   import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// export default function EventDetailsArea() {
//   const { slug } = useParams<{ slug: string }>();
//   const [event, setEvent] = useState<EventDetails | null>(null);

//   useEffect(() => {
//     if (!slug) return;

//     fetch(`${BASE_URL}/events/${slug}`, { cache: "no-store" })
//       .then((res) => res.json())
//       .then(setEvent);
//   }, [slug]);

//   if (!event) return null;

//   return (
//     <section className="event__details-area section-py-120">
//       <div className="container">
//         <div className="row">
//           <div className="col-lg-12">

//             {/* Cover */}
//             <div className="event__details-thumb">
//               <Image
//                 src={
//                   event.coverImage
//                     ? `${BASE_URL}/uploads/events/${event.coverImage}`
//                     : fallbackCover
//                 }
//                 alt="Event Cover"
//                 width={1200}
//                 height={500}
//               />
//             </div>

//             <div className="event__details-content-wrap">
//               <div className="row">

//                 {/* LEFT */}
//                 <div className="col-70">
//                   <div className="event__details-content">

//                     <h2 className="title">{event.title}</h2>

//                     {/* Meta */}
//                     <div className="event__meta">
//                       <ul className="list-wrap">

//                         {event.instructorName && (
//                           <li className="author">
//                             <i className="flaticon-user"></i>
//                             By{" "}
//                             {event.instructorLinkedIn ? (
//                               <Link
//                                 to={event.instructorLinkedIn}
//                                 target="_blank"
//                               >
//                                 {event.instructorName}
//                               </Link>
//                             ) : (
//                               <span>{event.instructorName}</span>
//                             )}
//                           </li>
//                         )}

//                         {event.location && (
//                           <li className="location">
//                             <i className="flaticon-placeholder"></i>
//                             {event.location}
//                           </li>
//                         )}

//                       </ul>
//                     </div>

//                     {/* Overview */}
//                     {event.description && (
//                       <div className="event__details-overview">
//                         <h4 className="title-two">Event Overview</h4>
//                         <p>{event.description}</p>
//                       </div>
//                     )}

//                     {/* Learning Outcomes */}
//                     {event.learningOutcomes && (
//                       <>
//                         <h4 className="title-two">
//                           What you&apos;ll learn in this event?
//                         </h4>
//                         <p>{event.learningOutcomes}</p>
//                       </>
//                     )}

//                     {/* Topics */}
//                     {event.topics && event.topics.length > 0 && (
//                       <div className="event__details-inner">
//                         <h4 className="title-two">Topics</h4>
//                         <ul className="about__info-list list-wrap">
//                           {event.topics.map((topic, index) => (
//                             <li
//                               key={index}
//                               className="about__info-list-item"
//                             >
//                               <i className="flaticon-angle-right"></i>
//                               <p className="content">{topic}</p>
//                             </li>
//                           ))}
//                         </ul>
//                       </div>
//                     )}

//                   </div>
//                 </div>

//                 {/* RIGHT / SIDEBAR */}
//                 <div className="col-30">
//                   <EventDetailsSidebar
//                     startDate={event.startDate}
//                     endDate={event.endDate}
//                     location={event.location}
//                     instructorLinkedIn={event.instructorLinkedIn}
//                     topics={event.topics}
//                   />
//                 </div>

//               </div>
//             </div>

//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }


