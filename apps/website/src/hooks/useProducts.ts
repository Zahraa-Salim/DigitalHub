// File: src/hooks/useProducts.ts
// Purpose: Reusable React hook encapsulating shared state, side effects, or behavior.
// If you change this file: Changing return values, timing, or side effects can impact every component that consumes this hook.
import { selectProducts } from "@/redux/features/productSlice";
import { useState } from "react";
import { useSelector } from "react-redux";

const useProducts = () => {
   const [products, setProducts] = useState(useSelector(selectProducts))
   return {
      products,
      setProducts
   }
}

export default useProducts;
