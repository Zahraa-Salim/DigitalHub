// File: frontend/src/main.tsx
// Purpose: Boots the frontend app and mounts the main React tree.
// It wires the router, providers, and global styles into the browser entry point.

import App from "@/App";
import { enableDefaultLazyMedia } from "@/lib/lazyMedia";
import store from "@/redux/store";
import "@/styles/index.scss";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/400-italic.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/500-italic.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/600-italic.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "aos/dist/aos.css";
import "react-responsive-modal/styles.css";
import "react-toastify/dist/ReactToastify.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "swiper/css/bundle";

enableDefaultLazyMedia();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

