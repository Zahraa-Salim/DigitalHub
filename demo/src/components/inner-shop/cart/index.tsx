"use client"
import FooterOne from "@/layouts/footers/FooterOne"
import HeaderOne from "@/layouts/headers/HeaderOne"
import BreadcrumbOne from "@/components/common/breadcrumb/BreadcrumbOne"
import CartArea from "./CartArea"

const Cart = () => {
   return (
      <>
         <HeaderOne />
         <main className="main-area fix">
            <BreadcrumbOne title="Cart" sub_title="Cart" />
            <CartArea />
         </main>
         <FooterOne />
      </>
   )
}

export default Cart