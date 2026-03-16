import feature_data from "@/data/home/homeContentData";
import Image, { type StaticImageData } from "@/components/common/Image";
import { getCmsNumber, getCmsRecordArray, getCmsString } from "@/lib/cmsContent";
import { EditableSpan } from "../EditableSpan";

type FeaturesProps = {
  content?: Record<string, unknown> | null;
  sectionId: number;
};

type FeatureCard = {
  id: number;
  title: string;
  desc: string;
  iconSrc: StaticImageData | string;
};

const FeaturesEditor = ({ content, sectionId }: FeaturesProps) => {
  const defaultItems: FeatureCard[] = feature_data
    .filter((items) => items.page === "home_1")
    .map((item) => ({
      id: item.id,
      title: item.title,
      desc: item.desc,
      iconSrc: item.icon || "",
    }));

  const customItems = getCmsRecordArray(content, ["items", "features"]).map((item, index) => {
    const fallback = defaultItems[index % defaultItems.length];
    return {
      id: index + 1,
      title: getCmsString(item, ["title", "name"], fallback?.title || `Feature ${index + 1}`),
      desc: getCmsString(item, ["description", "desc"], fallback?.desc || ""),
      iconSrc: getCmsString(item, ["icon_url", "icon"], "") || fallback?.iconSrc || "",
    };
  });

  const cards = customItems.length ? customItems : defaultItems;
  const cardsLimit = Math.trunc(getCmsNumber(content, ["limit", "card_limit", "items_limit"], cards.length, 1, 24));

  return (
    <section className="features__area">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-6">
            <div className="section__title white-title text-center mb-50">
              <EditableSpan sectionId={sectionId} field="subtitle" fallback="How We Start Journey" tag="span" className="sub-title" />
              <EditableSpan sectionId={sectionId} field="title" fallback="Start your Learning Journey Today!" tag="h2" className="title" />
              <p>
                <EditableSpan
                  sectionId={sectionId}
                  field="description"
                  fallback="Groove's intuitive shared inbox makes team members work together to organize and prioritize."
                  multiline
                />
              </p>
            </div>
          </div>
        </div>
        <div className="row justify-content-center">
          {cards.slice(0, cardsLimit).map((item) => (
            <div key={item.id} className="col-xl-3 col-lg-4 col-md-6">
              <div className="features__item">
                <div className="features__icon">
                  <Image src={item.iconSrc} className="injectable" alt="img" />
                </div>
                <div className="features__content">
                  <h4 className="title">{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesEditor;
