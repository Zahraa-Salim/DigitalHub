// File: frontend/src/redux/features/productSlice.ts
// Purpose: Stores Redux state and reducers for product slice.
// It defines how this slice of frontend state is updated and selected.

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import products from '@/data/mock/productCatalogData';

type Product = (typeof products)[number];

interface ProductState {
   products: Product[];
   product: Product | null;
}

const initialState: ProductState = {
   products: products,
   product: null,
};

export const productSlice = createSlice({
   name: 'products',
   initialState,
   reducers: {
      single_product: (state, action: PayloadAction<number>) => {
         state.product = state.products.find((p) => Number(p.id) === Number(action.payload)) ?? null;
      },
   },
});

export const { single_product } = productSlice.actions;

// Selectors
export const selectProducts = (state: { products: ProductState }) => state?.products?.products;
export const selectProduct = (state: { products: ProductState }) => state?.products?.product;

export default productSlice.reducer;

