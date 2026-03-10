// File: frontend/src/redux/store.ts
// Purpose: Creates the Redux store used by the frontend application.
// It combines the available slices so React components can share app state.

import { configureStore } from '@reduxjs/toolkit';
import courseSlice from './features/courseSlice';
import cartSlice from './features/cartSlice';
import productSlice from './features/productSlice';
import wishlistSlice from './features/wishlistSlice';

const store = configureStore({
    reducer: {
        courses: courseSlice,
        products: productSlice,
        cart: cartSlice,
        wishlist: wishlistSlice,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false,
    }),
});

export default store;

