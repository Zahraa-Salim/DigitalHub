// File: frontend/src/dashboard/pages/OverviewPage.tsx
// Purpose: Renders the dashboard overview page page.
// It handles the route-level UI and logic for this dashboard screen.

import { OverviewTab } from "../components/overview-mock/OverviewTab";
import "../styles/overview-mock-utilities.css";

export function OverviewPage() {
  return (
    <section className="page-section page-section--scroll">
      <OverviewTab />
    </section>
  );
}

