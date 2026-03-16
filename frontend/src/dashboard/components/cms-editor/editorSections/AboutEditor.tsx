import { useState } from "react";
import Image, { VideoPopup } from "@/components/common/Image";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";
import { resolveCmsImage } from "@/lib/cmsImageResolver";
import about_img1 from "@/assets/img/others/about_img.png";
import about_img2 from "@/assets/img/others/about_shape.svg";
import { EditableImage } from "../EditableImage";
import { EditableSpan } from "../EditableSpan";
import { useEditor } from "../EditorContext";

type AboutEditorProps = {
  content?: Record<string, unknown> | null;
  sectionId: number;
};

const defaultBulletPoints = [
  "Job-ready web and digital training",
  "Hands-on projects with mentor support",
  "Career preparation for real opportunities",
];

const AboutEditor = ({ sectionId }: AboutEditorProps) => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const { getValue } = useEditor();
  const imageRegistry = {
    "about_img.png": about_img1,
    "about_shape.svg": about_img2,
  } as const;
  const mainImage = resolveCmsImage(getValue(sectionId, "main_image_url"), imageRegistry, about_img1);

  return (
    <>
      <section id="home-about" className="about-area tg-motion-effects section-py-120">
        <div className="container">
          <div className="row align-items-center justify-content-center">
            <div className="col-lg-6 col-md-9">
              <div className="about__images">
                <EditableImage
                  sectionId={sectionId}
                  field="main_image_url"
                  fallbackSrc={about_img1}
                  previewSrc={mainImage}
                  alt="img"
                  className="main-img"
                />
                <Image src={about_img2} alt="img" className="shape alltuchtopdown" />
              </div>
            </div>

            <div className="col-lg-6">
              <div className="about__content">
                <div className="section__title">
                  <EditableSpan sectionId={sectionId} field="subtitle" fallback="About The Digital Hub" tag="span" className="sub-title" />
                  <EditableSpan
                    sectionId={sectionId}
                    field="title"
                    fallback="Empowering Youth with Practical Digital Skills"
                    tag="h2"
                    className="title"
                  />
                </div>

                <p className="desc">
                  <EditableSpan
                    sectionId={sectionId}
                    field="description"
                    fallback="The Digital Hub helps youth build practical digital skills through guided training, mentorship, and real projects that connect learning to work."
                    multiline
                  />
                </p>

                <ul className="about__info-list list-wrap">
                  {defaultBulletPoints.slice(0, 4).map((point, idx) => (
                    <li key={`${point}-${idx}`} className="about__info-list-item">
                      <i className="flaticon-angle-right"></i>
                      <p className="content">{point}</p>
                    </li>
                  ))}
                </ul>

                <div className="tg-button-wrap">
                  <Link to="/about-us" className="btn arrow-btn">
                    <EditableSpan sectionId={sectionId} field="cta_text" fallback="Learn More About Us" /> <BtnArrow />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <VideoPopup isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} videoId="b2Az7_lLh3g" />
    </>
  );
};

export default AboutEditor;
