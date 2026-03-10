// File: frontend/src/App.tsx
// Purpose: Composes the top-level route tree for the public site and dashboard.
// It decides which route groups render inside the frontend application shell.

import AppRoutes from "@/routes/AppRoutes";

const App = () => {
  return <AppRoutes />;
};

export default App;

