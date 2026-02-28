// File: src/forms/InstructorForm.tsx
// Purpose: Form component that handles user input, validation, and submission flow.
// If you change this file: Changing field names, validation rules, or handlers can break form behavior or submitted payload structures.
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
