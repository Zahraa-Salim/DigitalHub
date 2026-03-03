import FooterOne from "@/layouts/footers/FooterOne";
import HeaderOne from "@/layouts/headers/HeaderOne";
import StudentProfileArea from "./StudentProfileArea";

const StudentProfile = () => {
  return (
    <>
      <HeaderOne />
      <main className="main-area fix">
        <StudentProfileArea />
      </main>
      <FooterOne />
    </>
  );
};

export default StudentProfile;
