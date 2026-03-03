import FooterOne from '@/layouts/footers/FooterOne'
import HeaderOne from '@/layouts/headers/HeaderOne'
import InstructorSettingArea from './InstructorSettingArea'

const InstructorSetting = () => {
   return (
      <>
         <HeaderOne />
         <main className="main-area fix">
            <InstructorSettingArea />
         </main>
         <FooterOne />
      </>
   )
}

export default InstructorSetting
