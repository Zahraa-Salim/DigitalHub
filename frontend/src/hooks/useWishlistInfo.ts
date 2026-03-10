// File: frontend/src/hooks/useWishlistInfo.ts
// Purpose: Provides the use wishlist info hook or helper component.
// It packages reusable view or state behavior for other frontend modules.

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

