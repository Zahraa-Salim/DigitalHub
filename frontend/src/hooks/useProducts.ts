// File: frontend/src/hooks/useProducts.ts
// Purpose: Provides the use products hook or helper component.
// It packages reusable view or state behavior for other frontend modules.

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

