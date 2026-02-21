// File: src/main.tsx
// Purpose: Bootstraps the React app and mounts global providers/styles.
// If you change this file: Changing imports or bootstrap order can break app startup, routing, or global UI behavior.
import App from "@/App";
import store from "@/redux/store";
import "@/styles/index.scss";
import "aos/dist/aos.css";
import "react-responsive-modal/styles.css";
import "react-toastify/dist/ReactToastify.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "swiper/css/bundle";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
