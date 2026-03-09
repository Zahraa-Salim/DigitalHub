// File: frontend/src/redux/store.ts
// What this code does:
// 1) Implements frontend module behavior for this feature area.
// 2) Combines UI, state, and side effects for this module.
// 3) Connects shared utilities/components where required.
// 4) Exports artifacts consumed by routes or parent modules.
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
