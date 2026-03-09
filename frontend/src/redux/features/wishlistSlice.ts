// File: frontend/src/redux/features/wishlistSlice.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
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
