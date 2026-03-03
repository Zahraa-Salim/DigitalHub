import FooterOne from '@/layouts/footers/FooterOne'
import HeaderOne from '@/layouts/headers/HeaderOne'
import InstructorProfileArea from './InstructorProfileArea'

const InstructorProfile = () => {
   return (
      <>
         <HeaderOne />
         <main className="main-area fix">
            <InstructorProfileArea />
         </main>
         <FooterOne />
      </>
   )
}

export default InstructorProfile
