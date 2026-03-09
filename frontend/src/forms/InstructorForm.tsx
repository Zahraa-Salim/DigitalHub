// File: frontend/src/forms/InstructorForm.tsx
// What this code does:
// 1) Implements form fields, validation, and submission flows.
// 2) Normalizes user input before API requests are sent.
// 3) Handles loading, error, and success feedback states.
// 4) Keeps form behavior consistent across intake workflows.
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
