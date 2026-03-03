import FooterOne from '@/layouts/footers/FooterOne'
import HeaderOne from '@/layouts/headers/HeaderOne'
import InstructorReviewArea from './InstructorReviewArea'

const InstructorReview = () => {
  return (
   <>
         <HeaderOne />
         <main className="main-area fix">
            <InstructorReviewArea />
         </main>
         <FooterOne />
      </>
  )
}

export default InstructorReview
