import DashboardBannerTwo from "@/dashboard/dashboard-common/DashboardBannerTwo"
import DashboardSidebarTwo from "@/dashboard/dashboard-common/DashboardSidebarTwo"
import InstructorEnrolledCourseContent from "@/dashboard/instructor-dashboard/instructor-enrolled-courses/InstructorEnrolledCourseContent"
import Image from "@/components/common/Image"
import bg_img from "@/assets/img/bg/dashboard_bg.jpg"

const StudentEnrolledCoursesArea = () => {
   return (
      <section className="dashboard__area section-pb-120">
         <div className="dashboard__bg"><Image src={bg_img} alt=""/></div>
         <div className="container">
            <DashboardBannerTwo />
            <div className="dashboard__inner-wrap">
               <div className="row">
                  <DashboardSidebarTwo />
                  <InstructorEnrolledCourseContent />
               </div>
            </div>
         </div>
      </section>
   )
}

export default StudentEnrolledCoursesArea

