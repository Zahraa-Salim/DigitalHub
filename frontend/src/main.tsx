// File: frontend/src/main.tsx
// What this code does:
// 1) Bootstraps the React application in the browser runtime.
// 2) Registers global providers, store, styles, and fonts.
// 3) Enables startup utilities required by app behavior.
// 4) Mounts the root app component into the DOM container.
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
