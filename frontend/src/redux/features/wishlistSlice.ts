// File: src/redux/features/wishlistSlice.ts
// Purpose: Redux store/slice module controlling application state and selectors.
// If you change this file: Changing state shape, reducers, or selectors can break hooks/components that rely on this state contract.
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { setLocalStorage, getLocalStorage } from "@/utils/localstorage";

interface Product {
   id: string;
   title: string;
   thumb: string;
   price: number;
}

interface WishlistState {
   wishlist: Product[];
}

const initialState: WishlistState = {
   wishlist: getLocalStorage<Product>("wishlist") || [], // Load initial state from localStorage
};

const wishlistSlice = createSlice({
   name: "wishlist",
   initialState,
   reducers: {
      addToWishlist: (state, { payload }: PayloadAction<Product>) => {
         const productIndex = state.wishlist.findIndex((item) => item.id === payload.id);
         if (productIndex < 0) {
            state.wishlist.push(payload);
            setLocalStorage("wishlist", state.wishlist); // Save wishlist to localStorage
         }
      },
      removeFromWishlist: (state, { payload }: PayloadAction<Product>) => {
         state.wishlist = state.wishlist.filter((item) => item.id !== payload.id);
         setLocalStorage("wishlist", state.wishlist); // Update localStorage
      },
      clearWishlist: (state) => {
         state.wishlist = [];
         setLocalStorage("wishlist", state.wishlist); // Clear localStorage
      },
   },
});

export const {
   addToWishlist,
   removeFromWishlist,
   clearWishlist,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
