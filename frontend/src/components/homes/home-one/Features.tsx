// File: frontend/src/components/homes/home-one/Features.tsx
// Purpose: Renders the features UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

import feature_data from "@/data/home/homeContentData";
import Image, { type StaticImageData } from "@/components/common/Image";
import { getCmsNumber, getCmsRecordArray, getCmsString } from "@/lib/cmsContent";

type FeaturesProps = {
  content?: Record<string, unknown> | null;
};

type FeatureCard = {
  id: number;
  title: string;
  desc: string;
  iconSrc: StaticImageData | string;
};

const Features = ({ content }: FeaturesProps) => {
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
   const subtitle = getCmsString(content, ["subtitle", "sub_title"], "How We Start Journey");
   const title = getCmsString(content, ["title", "heading"], "Start your Learning Journey Today!");
   const description = getCmsString(
      content,
      ["description", "body"],
      "Groove's intuitive shared inbox makes team members work together to organize and prioritize."
   );

   return (
      <section className="features__area">
         <div className="container">
            <div className="row justify-content-center">
               <div className="col-xl-6">
                  <div className="section__title white-title text-center mb-50">
                     <span className="sub-title">{subtitle}</span>
                     <h2 className="title">{title}</h2>
                     <p>{description}</p>
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
   )
}

export default Features;

