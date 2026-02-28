import { OverviewTab } from "../components/overview-mock/OverviewTab";
import "../styles/overview-mock-utilities.css";

export function OverviewPage() {
  return (
    <section className="page-section page-section--scroll">
      <OverviewTab />
    </section>
  );
}
