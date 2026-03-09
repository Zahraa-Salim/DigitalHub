// File: src/pages/courses.tsx
// Purpose: Backward-compatible route that redirects old /courses links to /programs.
import { Navigate } from "react-router-dom";

const page = () => <Navigate to="/programs" replace />;

export default page;

