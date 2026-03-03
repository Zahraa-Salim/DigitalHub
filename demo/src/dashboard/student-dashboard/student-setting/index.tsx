import FooterOne from '@/layouts/footers/FooterOne'
import HeaderOne from '@/layouts/headers/HeaderOne'
import StudentSettingArea from './StudentSettingArea'

const StudentSetting = () => {
   return (
      <>
         <HeaderOne />
         <main className="main-area fix">
            <StudentSettingArea />
         </main>
         <FooterOne />
      </>
   )
}

export default StudentSetting

