import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import BtnArrow from "@/svg/BtnArrow";
import InjectableSvg from "@/hooks/InjectableSvg";
import { EditableImage } from "../EditableImage";
import { EditableSpan } from "../EditableSpan";

type InstructorTwoEditorProps = {
  content?: Record<string, unknown> | null;
  sectionId: number;
};

const InstructorTwoEditor = ({ sectionId }: InstructorTwoEditorProps) => {
  return (
    <section className="instructor__area-two">
      <div className="container">
        <div className="instructor__item-wrap-two">
          <div className="row">
            <div className="col-xl-6">
              <div className="instructor__item-two">
                <div className="instructor__thumb-two">
                  <EditableImage sectionId={sectionId} field="left.image_url" fallbackSrc="/assets/img/instructor/instructor_two01.png" alt="img" />
                  <div className="shape-one">
                    <InjectableSvg src="/assets/img/instructor/instructor_shape01.svg" alt="img" className="injectable" />
                  </div>
                </div>
                <div className="instructor__content-two">
                  <h3 className="title">
                    <Link to="/apply?program=Full%20Stack%20Development">
                      <EditableSpan sectionId={sectionId} field="left.title" fallback="Become a Mentor" />
                    </Link>
                  </h3>
                  <p>
                    <EditableSpan
                      sectionId={sectionId}
                      field="left.description"
                      fallback="To take a trivial example, which of us undertakes physical exercise yes is this happen here."
                      multiline
                    />
                  </p>
                  <div className="tg-button-wrap">
                    <Link to="/apply?program=Full%20Stack%20Development" className="btn arrow-btn">
                      <EditableSpan sectionId={sectionId} field="left.button_text" fallback="Apply Now" /> <BtnArrow />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-6">
              <div className="instructor__item-two">
                <div className="instructor__thumb-two">
                  <EditableImage sectionId={sectionId} field="right.image_url" fallbackSrc="/assets/img/instructor/instructor_two02.png" alt="img" />
                  <div className="shape-one">
                    <InjectableSvg src="/assets/img/instructor/instructor_shape01.svg" alt="img" className="injectable" />
                  </div>
                </div>
                <div className="instructor__content-two">
                  <h3 className="title">
                    <Link to="/apply?program=UI%2FUX%20Design">
                      <EditableSpan sectionId={sectionId} field="right.title" fallback="Become a Participant" />
                    </Link>
                  </h3>
                  <p>
                    <EditableSpan
                      sectionId={sectionId}
                      field="right.description"
                      fallback="Join millions of people from around the world learning together. Online learning"
                      multiline
                    />
                  </p>
                  <div className="tg-button-wrap">
                    <Link to="/apply?program=UI%2FUX%20Design" className="btn arrow-btn">
                      <EditableSpan sectionId={sectionId} field="right.button_text" fallback="Apply Now" /> <BtnArrow />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstructorTwoEditor;
