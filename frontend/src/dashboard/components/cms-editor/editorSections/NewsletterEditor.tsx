import Image from "@/components/common/Image";
import newsletter_img2 from "@/assets/img/others/newsletter_shape01.png";
import newsletter_img3 from "@/assets/img/others/newsletter_shape02.png";
import newsletter_img4 from "@/assets/img/others/newsletter_shape03.png";
import { EditableImage } from "../EditableImage";
import { EditableSpan } from "../EditableSpan";

type NewsletterProps = {
  content?: Record<string, unknown> | null;
  sectionId: number;
};

const NewsletterEditor = ({ sectionId }: NewsletterProps) => {
  return (
    <section className="newsletter__area">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-4">
            <div className="newsletter__img-wrap">
              <EditableImage sectionId={sectionId} field="main_image_url" fallbackSrc="/assets/img/others/newsletter_img.png" alt="img" />
              <Image src={newsletter_img2} alt="img" data-aos="fade-up" data-aos-delay="400" />
              <Image src={newsletter_img3} alt="img" className="alltuchtopdown" />
            </div>
          </div>
          <div className="col-lg-8">
            <div className="newsletter__content">
              <h2 className="title">
                <EditableSpan sectionId={sectionId} field="title_prefix" fallback="Want to stay" />{" "}
                <span><EditableSpan sectionId={sectionId} field="title_highlight" fallback="informed" /></span>{" "}
                <EditableSpan sectionId={sectionId} field="title_suffix" fallback="about" />
                <br />
                <EditableSpan sectionId={sectionId} field="title_second_line_prefix" fallback="new" />{" "}
                <span><EditableSpan sectionId={sectionId} field="title_second_line_highlight" fallback="courses & study?" /></span>
              </h2>
              <div className="newsletter__form">
                <form onSubmit={(event) => event.preventDefault()}>
                  <input type="email" placeholder="Type your e-mail" />
                  <button type="submit" className="btn">
                    <EditableSpan sectionId={sectionId} field="button_text" fallback="Subscribe Now" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="newsletter__shape">
        <Image src={newsletter_img4} alt="img" data-aos="fade-left" data-aos-delay="400" />
      </div>
    </section>
  );
};

export default NewsletterEditor;
