// File: frontend/src/forms/InstructorForm.tsx
// Purpose: Renders the instructor form form used in the frontend.
// It owns the form fields, local state, and submission flow for this UI.

"use client"
import BtnArrow from "@/svg/BtnArrow"

const InstructorForm = () => {

   return (
      <form onSubmit={(e) => e.preventDefault()}>
         <div className="form-grp">
            <input type="text" placeholder="Name" />
         </div>
         <div className="form-grp">
            <input type="email" placeholder="E-mail" />
         </div>
         <div className="form-grp">
            <input type="text" placeholder="Topic" />
         </div>
         <div className="form-grp">
            <input type="number" placeholder="Phone" />
         </div>
         <div className="form-grp">
            <textarea placeholder="Type Message"></textarea>
         </div>
         <button type="submit" className="btn arrow-btn">Send Message <BtnArrow /></button>
      </form>
   )
}

export default InstructorForm

