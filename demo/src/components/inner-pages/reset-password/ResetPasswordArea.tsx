"use client";

import { useSearchParams } from "@/utils/navigation";
import Link from "@/components/common/Link";
import RequestResetForm from "@/forms/RequestResetForm";
import ResetPasswordForm from "@/forms/ResetPasswordForm";

export default function ResetPasswordArea() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // ✅ debug (remove later)
  // console.log("RESET TOKEN:", token);

  return (
    <section className="singUp-area section-py-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-6 col-lg-8">
            <div className="singUp-wrap">
              {token ? (
                <>
                  <h2 className="title">Set a new password</h2>
                  <p>Enter a new password for your account.</p>
                  <ResetPasswordForm token={token ?? ""} />

                </>
              ) : (
                <>
                  <h2 className="title">Forgot your password?</h2>
                  <p>Enter your email and we’ll send you a reset link.</p>
                  <RequestResetForm />
                </>
              )}

              <div className="account__switch">
                <p>
                  Remembered your password? <Link to="/login">Login</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


