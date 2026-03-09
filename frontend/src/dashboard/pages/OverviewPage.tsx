// File: frontend/src/dashboard/pages/OverviewPage.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { OverviewTab } from "../components/overview-mock/OverviewTab";
import "../styles/overview-mock-utilities.css";

export function OverviewPage() {
  return (
    <section className="page-section page-section--scroll">
      <OverviewTab />
    </section>
  );
}
