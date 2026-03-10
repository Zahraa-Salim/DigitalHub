// File: frontend/src/hooks/useCartInfo.ts
// Purpose: Provides the use cart info hook or helper component.
// It packages reusable view or state behavior for other frontend modules.

"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";

interface CartItem {
   price: number;
   quantity: number;
}

interface CartSummary {
   quantity: number;
   total: number;
}

type RootState = {
   cart: {
      cart: CartItem[];
   };
};

const useCartInfo = () => {
   const cartItems = useSelector((state: RootState) => state.cart.cart);

   const cart = useMemo(
      () =>
         cartItems.reduce(
         (cartTotal: CartSummary, cartItem: CartItem) => {
            const { price, quantity } = cartItem;
            const itemTotal = price * quantity;

            cartTotal.total += itemTotal;
            cartTotal.quantity += quantity;

            return cartTotal;
         },
         {
            total: 0,
            quantity: 0,
         }
      ),
      [cartItems]
   );
   return {
      quantity: cart.quantity,
      total: cart.total,
   };
}

export default useCartInfo;

