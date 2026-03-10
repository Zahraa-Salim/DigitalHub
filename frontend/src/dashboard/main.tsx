// File: frontend/src/dashboard/main.tsx
// Purpose: Contains frontend code for main.
// It supports this part of the user interface and page behavior.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRouter } from "./app/AppRouter";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);

