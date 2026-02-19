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
        <header className="page-header">
          <div>
            <h1 className="page-header__title">{title}</h1>
            {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}
