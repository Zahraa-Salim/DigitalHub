import FooterOne from '@/layouts/footers/FooterOne'
import HeaderOne from '@/layouts/headers/HeaderOne'
import InstructorAssignmentArea from './InstructorAssignmentArea'

const InstructorAssignment = () => {
   return (
      <>
         <HeaderOne />
         <main className="main-area fix">
            <InstructorAssignmentArea />
         </main>
         <FooterOne />
      </>
   )
}

export default InstructorAssignment
