import FooterOne from '@/layouts/footers/FooterOne'
import HeaderOne from '@/layouts/headers/HeaderOne'
import InstructorAttemptsArea from './InstructorAttemptsArea'

const InstructorAttempts = () => {
   return (
      <>
         <HeaderOne />
         <main className="main-area fix">
            <InstructorAttemptsArea />
         </main>
         <FooterOne />
      </>
   )
}

export default InstructorAttempts
