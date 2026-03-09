// File: frontend/src/hooks/useWishlistInfo.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
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
