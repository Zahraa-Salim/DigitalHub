"use client";

import DashboardBannerTwo from "@/dashboard/dashboard-common/DashboardBannerTwo";
import DashboardSidebarTwo from "@/dashboard/dashboard-common/DashboardSidebarTwo";
import Image from "@/components/common/Image";
import bg_img from "@/assets/img/bg/dashboard_bg.jpg";
import StudentProfileForm from "@/dashboard/student-dashboard/student-profile/StudentProfileForm";

import { useSearchParams } from "@/utils/navigation";

const StudentProfileArea = () => {
  const params = useSearchParams();
  const setupMode = params.get("setup") === "1";

  return (
    <section className="dashboard__area section-pb-120">
      <div className="dashboard__bg">
        <Image src={bg_img} alt="" />
      </div>

      <div className="container">
        <DashboardBannerTwo />

        <div className="dashboard__inner-wrap">
          <div className="row">
            <DashboardSidebarTwo />

            {/* RIGHT SIDE */}
            <div className="col-lg-9">
              <div className="dashboard__content-wrap">
                <div className="dashboard__content-title">
                  <h4 className="title">
                    {setupMode ? "Complete Your Profile" : "My Profile"}
                  </h4>
                </div>

                <StudentProfileForm setupMode={setupMode} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StudentProfileArea;

