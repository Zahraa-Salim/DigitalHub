// File: src/hooks/useWishlistInfo.ts
// Purpose: Reusable React hook encapsulating shared state, side effects, or behavior.
// If you change this file: Changing return values, timing, or side effects can impact every component that consumes this hook.
"use client";
import { useSelector } from "react-redux";

interface WishlistItem {
   id: string;
   title: string;
   thumb: string;
   price: number;
}

type RootState = {
   wishlist: {
      wishlist: WishlistItem[];
   };
};

const useWishlistInfo = () => {
   const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlist);

   return {
      wishlistItems,
   };
}

export default useWishlistInfo;
