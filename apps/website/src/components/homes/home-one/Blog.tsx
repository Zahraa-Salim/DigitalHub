// File: src/components/homes/home-one/Blog.tsx
// Purpose: UI component responsible for rendering part of the interface (homes/home-one/Blog.tsx).
// If you change this file: Changing props, markup, or logic here will directly affect the rendered section and can break callers using this component API.
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
                     <div className="blog__post-item shine__animate-item">
                        <div className="blog__post-thumb">
                           <Link to="/about-us" className="shine__animate-link"><Image src={item.thumb} alt="img" /></Link>
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



