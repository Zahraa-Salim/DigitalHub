// frontend/website/components/courses/course-details/Overview.tsx

type OverviewProps = {
  program?: any;
};

const Overview = ({ program }: OverviewProps) => {
  const fullDescription =
    program?.fullDescription ||
    "This program description will be provided soon. Stay tuned for more details about this Digital Hub program.";

  const shortDescription =
    program?.shortDescription ||
    "Short overview of the key topics and learning goals of this program.";

  return (
    <div className="courses__overview-wrap">
      <h3 className="title">Program Description</h3>
      <p>{fullDescription}</p>

      <h3 className="title">What you&apos;ll learn in this program</h3>
      <p>{shortDescription}</p>

      <ul className="about__info-list list-wrap">
        {program?.level && (
          <li className="about__info-list-item">
            <i className="flaticon-angle-right"></i>
            <p className="content">Level: {program.level}</p>
          </li>
        )}

        {program?.durationLabel && (
          <li className="about__info-list-item">
            <i className="flaticon-angle-right"></i>
            <p className="content">Duration: {program.durationLabel}</p>
          </li>
        )}

        {program?.applicationLink && (
          <li className="about__info-list-item">
            <i className="flaticon-angle-right"></i>
            <p className="content">
              Application link:{" "}
              <a
                href={program.applicationLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Apply here
              </a>
            </p>
          </li>
        )}
      </ul>

      <p className="last-info">
        More information and modules will be available during the program. This
        Digital Hub program is designed to provide practical skills and
        hands-on experience.
      </p>
    </div>
  );
};

export default Overview;
