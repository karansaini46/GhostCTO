import type { ReactNode } from 'react';

export type PageHeaderProps = {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

export const PageHeader = ({ actions, description, eyebrow, title }: PageHeaderProps) => (
  <div className="animate-enter flex flex-col gap-5 border-b border-subtle pb-6 lg:flex-row lg:items-end lg:justify-between">
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-balance font-editorial text-4xl font-semibold leading-tight tracking-normal text-text lg:text-5xl">
        {title}
      </h1>
      {description ? <p className="mt-3 text-base leading-7 text-secondary">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
  </div>
);
