// File: src/main.tsx
// Purpose: Bootstraps the React app and mounts global providers/styles.
// If you change this file: Changing imports or bootstrap order can break app startup, routing, or global UI behavior.
import App from "@/App";
import store from "@/redux/store";
import "@/styles/index.scss";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
