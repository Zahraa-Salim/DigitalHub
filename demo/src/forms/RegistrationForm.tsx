"use client"
import BtnArrow from "@/svg/BtnArrow"

const RegistrationForm = () => {

   return (
      <form onSubmit={(e) => e.preventDefault()} className="account__form">
         <div className="row gutter-20">
            <div className="col-md-6">
               <div className="form-grp">
                  <label htmlFor="fast-name">First Name</label>
                  <input type="text" id="fast-name" placeholder="First Name" />
               </div>
            </div>
            <div className="col-md-6">
               <div className="form-grp">
                  <label htmlFor="last-name">Last name</label>
                  <input type="text" id="last-name" placeholder="Last name" />
               </div>
            </div>
         </div>
         <div className="form-grp">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="email" />
         </div>
         <div className="form-grp">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="password" />
         </div>
         <div className="form-grp">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input type="password" id="confirm-password" placeholder="Confirm Password" />
         </div>
         <button type="submit" className="btn btn-two arrow-btn">Sign Up<BtnArrow /></button>
      </form>
   )
}

export default RegistrationForm
