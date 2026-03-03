import BtnArrow from "@/svg/BtnArrow"
import Image from "@/components/common/Image"
import Link from "@/components/common/Link"

import avatar from "@/assets/img/courses/details_instructors01.jpg"
import avatar_2 from "@/assets/img/courses/details_instructors02.jpg"

interface StyleType{
   style?:boolean;
}

const DashboardBanner = ({ style }: StyleType) => {
   return (
      <div className="dashboard__top-wrap">
         <div className="dashboard__top-bg" style={{ backgroundImage: `url(/assets/img/bg/instructor_dashboard_bg.jpg)` }}></div>
         <div className="dashboard__instructor-info">
            <div className="dashboard__instructor-info-left">
               <div className="thumb">
                  <Image src={style ? avatar_2 : avatar} alt="img" />
               </div>
               <div className="content">
                  <h4 className="title">{style ? "Emily Hannah" : "John Due"}</h4>
                  <div className="review__wrap review__wrap-two">
                     <div className="rating">
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                     </div>
                     <span>(15 Reviews)</span>
                  </div>
               </div>
            </div>
            <div className="dashboard__instructor-info-right">
               <Link to="#" className="btn btn-two arrow-btn">Create a New Course <BtnArrow /></Link>
            </div>
         </div>
      </div>
   )
}

export default DashboardBanner


