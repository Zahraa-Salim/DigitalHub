import StudentDashboard from "@/dashboard/student-dashboard/student-dashboard";
import Wrapper from "@/layouts/Wrapper";
import StudentOnly from "@/components/auth/StudentOnly";
const index = () => {
   return (
      <Wrapper>
          <StudentOnly>
         <StudentDashboard />
         </StudentOnly>
      </Wrapper>
   )
}

export default index
