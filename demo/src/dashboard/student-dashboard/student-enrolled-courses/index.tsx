import FooterOne from '@/layouts/footers/FooterOne'
import HeaderOne from '@/layouts/headers/HeaderOne'
import StudentEnrolledCoursesArea from './StudentEnrolledCoursesArea'

const StudentEnrolledCourses = () => {
   return (
      <>
         <HeaderOne />
         <main className="main-area fix">
            <StudentEnrolledCoursesArea />
         </main>
         <FooterOne />
      </>
   )
}

export default StudentEnrolledCourses
