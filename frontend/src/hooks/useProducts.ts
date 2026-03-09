// File: frontend/src/hooks/useProducts.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
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
