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
