// File: src/redux/features/productSlice.ts
// Purpose: Redux store/slice module controlling application state and selectors.
// If you change this file: Changing state shape, reducers, or selectors can break hooks/components that rely on this state contract.
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import products from '@/data/mock/productCatalogData';

interface Product {
   id: number;
   // Add other properties of your product here
}

interface ProductState {
   products: Product[] | any[];
   product: Product | {};
}

const initialState: ProductState = {
   products: products,
   product: {},
};

export const productSlice = createSlice({
   name: 'products',
   initialState,
   reducers: {
      single_product: (state, action: PayloadAction<number>) => {
         state.product = state.products.find((p) => Number(p.id) === Number(action.payload)) || {};
      },
   },
});

export const { single_product } = productSlice.actions;

// Selectors
export const selectProducts = (state: { products: ProductState }) => state?.products?.products;
export const selectProduct = (state: { products: ProductState }) => state?.products?.product;

export default productSlice.reducer;
