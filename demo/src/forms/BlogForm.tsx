
"use client"
import BtnArrow from "@/svg/BtnArrow"

const BlogForm = () => {

   return (
      <div className="comment-respond">
         <h4 className="comment-reply-title">Post a comment</h4>
         <form onSubmit={(e) => e.preventDefault()} className="comment-form">
            <p className="comment-notes">
               <span>Your email address will not be published. Required fields are marked *</span>
            </p>
            <div className="comment-field">
               <textarea placeholder="Comment"></textarea>
            </div>
            <div className="row">
               <div className="col-lg-4">
                  <div className="comment-field">
                     <input type="text" placeholder="Name" />
                  </div>
               </div>
               <div className="col-lg-4">
                  <div className="comment-field">
                     <input type="email" placeholder="Email" />
                  </div>
               </div>
               <div className="col-lg-4">
                  <div className="comment-field">
                     <input type="url" placeholder="Website" />
                  </div>
               </div>
            </div>
            <div className="comment-field checkbox-grp">
               <input type="checkbox" id="checkbox_two" />
               <label htmlFor="checkbox_two">Save my name, email, and website in this browser for the next time I comment.</label>
            </div>
            <p className="form-submit"></p>
            <button className="btn btn-two arrow-btn">Post Comment <BtnArrow /></button>
         </form>
      </div>
   )
}

export default BlogForm
