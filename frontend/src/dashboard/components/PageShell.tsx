// File: frontend/src/dashboard/components/PageShell.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import type { ReactNode } from "react";

type PageShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <section className="page-section page-section--scroll">
      {title ? (
        <header className="page-header dh-page__header">
          <div>
            <h1 className="page-header__title dh-page__title">{title}</h1>
            {subtitle ? <p className="page-header__subtitle dh-page__subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="dh-page__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
