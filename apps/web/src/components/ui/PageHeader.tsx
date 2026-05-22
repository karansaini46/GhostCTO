import type { ReactNode } from 'react';

export type PageHeaderProps = {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

export const PageHeader = ({ actions, description, eyebrow, title }: PageHeaderProps) => (
  <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="mb-2 text-sm font-medium tracking-normal text-accent">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-normal text-text">{title}</h1>
      {description ? <p className="mt-3 text-base leading-7 text-muted">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
  </div>
);
