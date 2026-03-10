// File: frontend/src/components/homes/home-one/Blog.tsx
// Purpose: Renders the blog UI block for the frontend.
// It encapsulates the markup and local behavior for this specific piece of the interface.

import { blog_data } from "@/data/home/homeContentData"
import Image from "@/components/common/Image"
import Link from "@/components/common/Link"

interface StyleType{
   style?:boolean;
}

const Blog = ({ style }: StyleType) => {
   return (
      <section className={`blog__post-area ${style ? "blog__post-area-two" : ""}`}>
         <div className="container">
            <div className="row justify-content-center">
               <div className="col-lg-6">
                  <div className="section__title text-center mb-40">
                     <span className="sub-title">News & Blogs</span>
                     <h2 className="title">Our Latest News Feed</h2>
                     <p>when known printer took a galley of type scrambl edmake</p>
                  </div>
               </div>
            </div>
            
            <div className="row gutter-20">
               {blog_data.filter((items) => items.page === "home_1").map((item) => (
                  <div key={item.id} className="col-xl-3 col-md-6">
                     <div className="blog__post-item">
                        <div className="blog__post-thumb">
                           <Link to="/about-us"><Image src={item.thumb} alt="img" /></Link>
                           <Link to="/about-us" className="post-tag">{item.tag}</Link>
                        </div>
                        <div className="blog__post-content">
                           <div className="blog__post-meta">
                              <ul className="list-wrap">
                                 <li><i className="flaticon-calendar"></i>{item.date}</li>
                                 <li><i className="flaticon-user-1"></i>by <Link to="/about-us">Admin</Link></li>
                              </ul>
                           </div>
                           <h4 className="title"><Link to="/about-us">{item.title}</Link></h4>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>
   )
}

export default Blog

