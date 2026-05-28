import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type ReportCardProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  meta?: ReactNode;
  subtitle?: string;
  title: string;
};

export const ReportCard = ({
  actions,
  children,
  className,
  meta,
  subtitle,
  title,
}: ReportCardProps) => (
  <article
    className={cn(
      'rounded-[1.25rem] border border-subtle bg-surface-card p-5 shadow-panel sm:p-8',
      className,
    )}
  >
    <header className="mb-7 flex flex-col gap-4 border-b border-subtle pb-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        {meta ? <div className="mb-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        <h1 className="font-editorial text-4xl font-semibold leading-tight tracking-normal text-text">
          {title}
        </h1>
        {subtitle ? <p className="mt-3 text-base leading-7 text-secondary">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
    {children}
  </article>
);
