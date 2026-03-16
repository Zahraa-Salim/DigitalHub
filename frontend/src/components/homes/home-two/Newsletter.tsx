// File: frontend/src/components/homes/home-two/Newsletter.tsx
// Purpose: Renders the newsletter/subscribe UI block for the frontend (home two variant).

"use client"
import { lazy, Suspense, useState, type FormEvent } from "react";
import Image from "@/components/common/Image"

import newsletter_img1 from "@/assets/img/others/newsletter_img.png"
import newsletter_img2 from "@/assets/img/others/newsletter_shape01.png"
import newsletter_img3 from "@/assets/img/others/newsletter_shape02.png"
import newsletter_img4 from "@/assets/img/others/newsletter_shape03.png"

const SubscribeModal = lazy(() => import("@/components/inner-pages/subscribe/SubscribeModal"));

const Newsletter = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [phone, setPhone] = useState("");

  const openModal = (event: FormEvent) => {
    event.preventDefault();
    setModalOpen(true);
  };

  return (
    <>
      <section className="newsletter__area">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-4">
              <div className="newsletter__img-wrap">
                <Image src={newsletter_img1} alt="img" />
                <Image src={newsletter_img2} alt="img" data-aos="fade-up" data-aos-delay="400" />
                <Image src={newsletter_img3} alt="img" className="alltuchtopdown" />
              </div>
            </div>
            <div className="col-lg-8">
              <div className="newsletter__content">
                <h2 className="title">
                  Want to stay <span>informed</span> about <br /> new <span>courses & updates?</span>
                </h2>
                <div className="newsletter__form">
                  <form onSubmit={openModal}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Your phone number"
                    />
                    <button
                      type="submit"
                      className="btn"
                    >
                      Subscribe Now
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="newsletter__shape">
          <Image src={newsletter_img4} alt="img" data-aos="fade-left" data-aos-delay="400" />
        </div>
      </section>

      {modalOpen && (
        <Suspense fallback={null}>
          <SubscribeModal initialPhone={phone} onClose={() => setModalOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default Newsletter;
