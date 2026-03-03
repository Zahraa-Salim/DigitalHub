import Image from "@/components/common/Image";
import Link from "@/components/common/Link";

import shape_1 from "@/assets/img/others/breadcrumb_shape01.svg";
import shape_2 from "@/assets/img/others/breadcrumb_shape02.svg";
import shape_3 from "@/assets/img/others/breadcrumb_shape03.svg";
import shape_4 from "@/assets/img/others/breadcrumb_shape04.svg";
import shape_5 from "@/assets/img/others/breadcrumb_shape05.svg";

interface StyleType {
  title: string;
  sub_title: string;
  sub_title_2?: string;
  style?: boolean;
}

const BreadcrumbOne = ({ title, sub_title, sub_title_2, style }: StyleType) => {
  return (
    <section
      className="breadcrumb__area breadcrumb__bg"
      style={{ backgroundImage: `url(/assets/img/bg/breadcrumb_bg.jpg)` }}
    >
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="breadcrumb__content">
              <h3 className="title">{title}</h3>

              <nav className="breadcrumb">
                {style ? (
                  <>
                    <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                      <Link to="/">Home</Link>
                    </span>

                    <span className="breadcrumb-separator">
                      <i className="fas fa-angle-right" />
                    </span>

                    <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                      <Link to="/events">{sub_title}</Link>
                    </span>

                    <span className="breadcrumb-separator">
                      <i className="fas fa-angle-right" />
                    </span>

                    <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                      {sub_title_2}
                    </span>
                  </>
                ) : (
                  <>
                    <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                      <Link to="/">Home</Link>
                    </span>

                    <span className="breadcrumb-separator">
                      <i className="fas fa-angle-right" />
                    </span>

                    <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                      {sub_title}
                    </span>
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="breadcrumb__shape-wrap">
        <Image src={shape_1} alt="img" className="alltuchtopdown" />
        <Image src={shape_2} alt="img" data-aos="fade-right" data-aos-delay="300" />
        <Image src={shape_3} alt="img" data-aos="fade-up" data-aos-delay="400" />
        <Image src={shape_4} alt="img" data-aos="fade-down-left" data-aos-delay="400" />
        <Image src={shape_5} alt="img" data-aos="fade-left" data-aos-delay="400" />
      </div>
    </section>
  );
};

export default BreadcrumbOne;


