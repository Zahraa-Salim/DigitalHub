import FooterOne from '@/layouts/footers/FooterOne'
import HeaderOne from '@/layouts/headers/HeaderOne'
import InstructorHistoryArea from './InstructorHistoryArea'

const InstructorHistory = () => {
   return (
      <>
         <HeaderOne />
         <main className="main-area fix">
            <InstructorHistoryArea />
         </main>
         <FooterOne />
      </>
   )
}

export default InstructorHistory
