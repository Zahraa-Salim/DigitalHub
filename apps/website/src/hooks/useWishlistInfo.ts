// File: src/hooks/useWishlistInfo.ts
// Purpose: Reusable React hook encapsulating shared state, side effects, or behavior.
// If you change this file: Changing return values, timing, or side effects can impact every component that consumes this hook.
"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const useWishlistInfo = () => {
   const [wishlistItems, setWishlistItems] = useState([]);
   const wishlist = useSelector((state: any) => state.wishlist.wishlist);

   useEffect(() => {
      setWishlistItems(wishlist);
   }, [wishlist]);

   return {
      wishlistItems,
   };
}

export default useWishlistInfo;
