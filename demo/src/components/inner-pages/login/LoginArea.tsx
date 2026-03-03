"use client";

import Image from "@/components/common/Image";
import Link from "@/components/common/Link";
import { useSearchParams } from "@/utils/navigation";

import icon from "@/assets/img/icons/google.svg";
import LoginForm from "@/forms/LoginForm";

const API_BASE_URL =
   import.meta.env.VITE_API_URL || "http://localhost:3000";

// set in frontend .env.local if you want to show the button:
// NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=true
const ENABLE_GOOGLE_LOGIN =
   import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === "true";

const LoginArea = () => {
   const searchParams = useSearchParams();
   const error = searchParams.get("error");

   return (
      <section className="singUp-area section-py-120">
         <div className="container">
            <div className="row justify-content-center">
               <div className="col-xl-6 col-lg-8">
                  <div className="singUp-wrap">
                     <h2 className="title">Welcome back!</h2>
                     <p>
                        Hey there! Ready to log in? Just enter your username and password
                        below and you&apos;ll be back in action in no time. Let&apos;s go!
                     </p>

                     {/* If backend redirects back with /login?error=not_invited */}
                     {error === "not_invited" ? (
                        <p className="text-danger mb-3" style={{ fontSize: 14 }}>
                           This Google account is not invited. Please use the email address that was
                           invited by the administrator.
                        </p>
                     ) : null}

                     {error === "activate_account" ? (
                        <p className="text-warning mb-3" style={{ fontSize: 14 }}>
                           Your account has been created, but it is not active yet.
                           Please check your email and set your password before logging in.
                        </p>
                     ) : null}


                     {ENABLE_GOOGLE_LOGIN ? (
                        <>
                           <div className="account__social">
                              <Link
                                 to={`${API_BASE_URL}/auth/google`}
                                 className="account__social-btn"
                              >
                                 <Image src={icon} alt="img" />
                                 Continue with google
                              </Link>
                           </div>

                           <div className="account__divider">
                              <span>or</span>
                           </div>
                        </>
                     ) : (
                        <div className="account__divider">
                           <span>or</span>
                        </div>
                     )}

                     <LoginForm />

                     <div className="account__switch">
                        <p>
                           Don&apos;t have an account?
                           <Link to="/registration">Sign Up</Link>
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>
   );
};

export default LoginArea;


