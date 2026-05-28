import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type SectionHeaderProps = {
  action?: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title: string;
};

export const SectionHeader = ({
  action,
  className,
  description,
  eyebrow,
  title,
}: SectionHeaderProps) => (
  <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      ) : null}
      <h2 className="mt-1 text-2xl font-semibold tracking-normal text-text">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-secondary">{description}</p> : null}
    </div>
    {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
  </div>
);
