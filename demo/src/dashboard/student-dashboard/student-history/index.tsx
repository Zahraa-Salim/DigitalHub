import FooterOne from '@/layouts/footers/FooterOne'
import HeaderOne from '@/layouts/headers/HeaderOne'
import StudentHistoryArea from './StudentHistoryArea'

const StudentHistory = () => {
   return (
      <>
         <HeaderOne />
         <main className="main-area fix">
            <StudentHistoryArea />
         </main>
         <FooterOne />
      </>
   )
}

export default StudentHistory

