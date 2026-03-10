// File: frontend/src/redux/features/cartSlice.ts
// Purpose: Stores Redux state and reducers for cart slice.
// It defines how this slice of frontend state is updated and selected.

"use client"
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { setLocalStorage, getLocalStorage } from "@/utils/localstorage";

interface Product {
   id: string;
   title: string;
   quantity: number;
}

interface CartState {
   cart: Product[];
   orderQuantity: number;
}

const initialState: CartState = {
   cart: getLocalStorage<Product>("cart") || [], // Load initial state from localStorage
   orderQuantity: 1,
};

const cartSlice = createSlice({
   name: "cart",
   initialState,
   reducers: {
      addToCart: (state, { payload }: PayloadAction<Product>) => {
         const productIndex = state.cart.findIndex((item) => item.id === payload.id);
         if (productIndex >= 0) {
            state.cart[productIndex].quantity += 1;
         } else {
            const tempProduct = { ...payload, quantity: 1 };
            state.cart.push(tempProduct);
         }
         setLocalStorage("cart", state.cart); // Save cart to localStorage
      },
      decrease_quantity: (state, { payload }: PayloadAction<Product>) => {
         const cartIndex = state.cart.findIndex((item) => item.id === payload.id);
         if (cartIndex >= 0 && state.cart[cartIndex].quantity > 1) {
            state.cart[cartIndex].quantity -= 1;
            setLocalStorage("cart", state.cart); // Update localStorage
         }
      },
      remove_cart_product: (state, { payload }: PayloadAction<Product>) => {
         state.cart = state.cart.filter((item) => item.id !== payload.id);
         setLocalStorage("cart", state.cart); // Update localStorage
      },
      clear_cart: (state) => {
         const confirmMsg = window.confirm("Are you sure you want to delete your cart?");
         if (confirmMsg) {
            state.cart = [];
            setLocalStorage("cart", state.cart); // Clear localStorage
         }
      },
      get_cart_products: (state) => {
         state.cart = getLocalStorage<Product>("cart"); // Load cart from localStorage
      },
   },
});

export const {
   addToCart,
   decrease_quantity,
   remove_cart_product,
   clear_cart,
   get_cart_products,
} = cartSlice.actions;

export default cartSlice.reducer;

